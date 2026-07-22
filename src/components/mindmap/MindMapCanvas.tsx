"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { MindMapNode } from "./nodes/MindMapNode";
import { MindMapToolbar, type MemberOption, type MindMapScope } from "./MindMapToolbar";
import { NodeDetailPanel } from "./NodeDetailPanel";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { buildVisibleGraph } from "@/lib/mindmap/buildGraph";
import { getAncestorIds, getSubtreeNodeIds } from "@/lib/mindmap/layout";
import { TASK_PAGE_SIZE, type TaskStatusFilter } from "@/lib/mindmap/constants";
import { fetchWorkspaces, fetchChildren, createTask, deleteTask } from "@/lib/mindmap/api";
import { pathIdsFromSelection, readMindmapPath, writeMindmapPath, workspaceIdFromPath, isHierarchyPath } from "@/lib/mindmap/urlState";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { usePersistedWorkspace } from "@/hooks/usePersistedWorkspace";
import { useAdminUnlocked } from "@/hooks/useAdminUnlocked";
import { makeNodeId, parseNodeId, isTaskType, type MindMapNodeData, type NodeRecord } from "@/types/mindmap";
import { matchesStatusFilter } from "@/lib/mindmap/statusFilter";

const nodeTypes = { mindmap: MindMapNode };

const LARGE_LIST_THRESHOLD = 200;
const SCOPE_KEY = "odin_scope";

function cloneSet<T>(set: Set<T>): Set<T> {
  return new Set(set);
}

function mergeChildrenIntoCache(
  map: Map<string, NodeRecord>,
  parentId: string,
  children: NodeRecord[],
): void {
  const parent = map.get(parentId);
  if (parent) {
    const directCount = children.filter((c) => c.data.parentId === parentId).length;
    map.set(parentId, {
      ...parent,
      data: {
        ...parent.data,
        childrenLoaded: true,
        childCount: directCount > 0 ? directCount : undefined,
      },
    });
  }
  for (const child of children) {
    if (!map.has(child.id)) map.set(child.id, child);
  }
}

/** Whether a deep-linked node would actually be visible in the current scope/admin mode. */
function isRestorableSelection(
  nodeId: string,
  cache: Map<string, NodeRecord>,
  scope: MindMapScope,
  adminUnlocked: boolean,
): boolean {
  const record = cache.get(nodeId);
  if (!record) return false;

  const isPeopleish = record.data.type === "people" || record.data.type === "member";

  if (scope.mode === "member") {
    const memberId = makeNodeId("member", scope.userId);
    let current: string | null = nodeId;
    while (current) {
      if (current === memberId) return true;
      current = cache.get(current)?.data.parentId ?? null;
    }
    return false;
  }

  // All-scope: people/member nodes require admin unlock.
  if (isPeopleish && !adminUnlocked) return false;
  return true;
}

function MindMapCanvasInner() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { workspaces, loading: wsLoading, activeTeamId, setTeamId } = usePersistedWorkspace();
  const { adminUnlocked, unlockAdmin, lockAdmin } = useAdminUnlocked();
  const [cache, setCache] = useState<Map<string, NodeRecord>>(new Map());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [taskVisibleLimits, setTaskVisibleLimits] = useState<Map<string, number>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading workspaces…");
  const [urlEpoch, setUrlEpoch] = useState(0);
  const [scope, setScope] = useState<MindMapScope>(() => {
    try {
      const raw = window.localStorage.getItem(SCOPE_KEY);
      if (!raw) return { mode: "all" };
      const parsed = JSON.parse(raw) as MindMapScope;
      if (!parsed || typeof parsed !== "object") return { mode: "all" };
      if (parsed.mode === "all") return { mode: "all" };
      if (
        parsed.mode === "member" &&
        typeof (parsed as any).teamId === "string" &&
        typeof (parsed as any).userId === "string" &&
        typeof (parsed as any).label === "string"
      ) {
        return parsed;
      }
      return { mode: "all" };
    } catch {
      return { mode: "all" };
    }
  });
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [createTaskContext, setCreateTaskContext] = useState<{
    listId: string;
    parentNodeId: string;
    parentTaskId?: string;
    title: string;
  } | null>(null);
  const fitOnNextLayout = useRef(false);
  const focusAfterLayoutRef = useRef<{ nodeId: string; mode: "subtree" | "self" } | null>(null);
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const countResolveInflight = useRef(new Set<string>());
  const restoreAttemptedRef = useRef(false);

  const handleTeamChange = useCallback(
    (teamId: string) => {
      setTeamId(teamId);
      setScope((prev) => {
        if (prev.mode === "member" && prev.teamId !== teamId) {
          const next = { mode: "all" as const };
          try {
            window.localStorage.setItem(SCOPE_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        }
        return prev;
      });
    },
    [setTeamId],
  );

  const handleScopeChange = useCallback((next: MindMapScope) => {
    setScope(next);
    try {
      window.localStorage.setItem(SCOPE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const selectedNode = selectedId ? cache.get(selectedId) ?? null : null;

  const viewCache = useMemo(() => {
    // Filter graph for current mode without mutating the underlying cache.
    const next = new Map<string, NodeRecord>();

    const isPeopleish = (t: string) => t === "people" || t === "member";

    if (scope.mode === "all") {
      for (const [id, rec] of cache) {
        if (!adminUnlocked && isPeopleish(rec.data.type)) continue;
        next.set(id, rec);
      }
      return next;
    }

    // Member scope: show only the selected member subtree (single-root mindmap).
    for (const [id, rec] of cache) {
      if (rec.data.parentId === null || rec.data.parentId === undefined) {
        // Only include the selected member root in this mode.
        if (rec.data.type === "member" && rec.data.clickupId === scope.userId) {
          next.set(id, rec);
        }
        continue;
      }
      // Include only descendants of the selected member node.
      const memberId = makeNodeId("member", scope.userId);
      if (id === memberId || rec.data.parentId === memberId) next.set(id, rec);
    }

    // Add deeper descendants (tasks under tasks, etc.)
    let added = true;
    while (added) {
      added = false;
      for (const [id, rec] of cache) {
        if (next.has(id)) continue;
        if (rec.data.parentId && next.has(rec.data.parentId)) {
          next.set(id, rec);
          added = true;
        }
      }
    }

    return next;
  }, [cache, scope, adminUnlocked]);

  const { nodes, edges } = useMemo(
    () =>
      buildVisibleGraph(
        viewCache,
        expandedIds,
        selectedId,
        loadingIds,
        taskVisibleLimits,
        statusFilter,
        adminUnlocked,
      ),
    [viewCache, expandedIds, selectedId, loadingIds, taskVisibleLimits, statusFilter, adminUnlocked],
  );

  // Resolve accurate direct-child counts in the background for visible collapsed nodes.
  // Does not expand nodes or change layout structure — only updates childCount (/cache).
  useEffect(() => {
    const targets: string[] = [];

    for (const node of nodes) {
      if (node.data.isExpanded || node.data.isLoading) continue;
      const record = cacheRef.current.get(node.id);
      if (!record || record.data.childrenLoaded || record.data.childCount != null) continue;
      if (countResolveInflight.current.has(node.id)) continue;

      const { type } = parseNodeId(node.id);
      if (type === "task" || type === "subtask" || type === "loadmore") continue;
      // Skip huge lists — user confirm still applies on explicit expand.
      if (type === "list" && (record.data.loadEstimate ?? 0) > LARGE_LIST_THRESHOLD) continue;

      targets.push(node.id);
    }

    if (targets.length === 0) return;

    let cancelled = false;
    for (const id of targets) countResolveInflight.current.add(id);

    void (async () => {
      try {
        const results = await mapWithConcurrency(targets, 3, async (nodeId) => {
          try {
            const record = cacheRef.current.get(nodeId);
            if (!record || record.data.childrenLoaded) return null;
            const { type } = parseNodeId(nodeId);
            const workspaceId = record.data.workspaceId as string | undefined;
            const children = await fetchChildren(
              nodeId,
              type === "member" ? { workspaceId } : undefined,
            );
            return { nodeId, children };
          } catch {
            return null;
          }
        });

        if (cancelled) return;

        setCache((prev) => {
          let changed = false;
          const next = new Map(prev);
          for (const result of results) {
            if (!result) continue;
            const parent = next.get(result.nodeId);
            if (!parent || parent.data.childrenLoaded) continue;
            changed = true;
            const directCount = result.children.filter((c) => c.data.parentId === result.nodeId)
              .length;
            next.set(result.nodeId, {
              ...parent,
              data: {
                ...parent.data,
                childrenLoaded: true,
                childCount: directCount > 0 ? directCount : undefined,
              },
            });
            for (const child of result.children) {
              if (!next.has(child.id)) next.set(child.id, child);
            }
          }
          return changed ? next : prev;
        });
      } finally {
        for (const id of targets) countResolveInflight.current.delete(id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nodes]);

  useEffect(() => {
    if (!selectedId) return;
    const record = viewCache.get(selectedId);
    if (!record) {
      // Hidden by scope / admin lock — drop stale selection.
      setSelectedId(null);
      return;
    }
    if (isTaskType(record.data.type) && !matchesStatusFilter(record.data, statusFilter)) {
      setSelectedId(null);
    }
  }, [statusFilter, selectedId, viewCache]);

  // Browser back/forward — re-read the deep link and reload the graph.
  useEffect(() => {
    function onPopState() {
      setUrlEpoch((n) => n + 1);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const resetGraph = useCallback(() => {
    setCache(new Map());
    setExpandedIds(new Set());
    setLoadingIds(new Set());
    setTaskVisibleLimits(new Map());
    setSelectedId(null);
    setError(null);
    fitOnNextLayout.current = false;
    focusAfterLayoutRef.current = null;
    restoreAttemptedRef.current = false;
  }, []);

  // Initial load / scope load (+ deep-link restore before first paint of the graph)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!activeTeamId && wsLoading) return;

      let deferLoading = false;

      try {
        resetGraph();
        setInitialLoading(true);

        const path = readMindmapPath();
        setLoadingMessage(path.length > 0 ? "Opening location…" : "Loading workspaces…");

        // Hierarchy deep links should not stay stuck in Me-only scope.
        if (path.length > 0 && scope.mode === "member" && isHierarchyPath(path)) {
          try {
            window.localStorage.setItem(SCOPE_KEY, JSON.stringify({ mode: "all" }));
          } catch {
            // ignore
          }
          deferLoading = true;
          setScope({ mode: "all" });
          return;
        }

        const bootCache = new Map<string, NodeRecord>();
        const bootExpanded = new Set<string>();
        const bootLimits = new Map<string, number>();

        const allWorkspaceNodes = await fetchWorkspaces();
        if (cancelled) return;

        // Align persisted workspace with the deep-link workspace when needed.
        const pathWorkspaceId = workspaceIdFromPath(path);
        if (
          pathWorkspaceId &&
          allWorkspaceNodes.some((n) => n.data.clickupId === pathWorkspaceId) &&
          pathWorkspaceId !== activeTeamId
        ) {
          deferLoading = true;
          setTeamId(pathWorkspaceId);
          return;
        }

        const workspaceNodes = activeTeamId
          ? allWorkspaceNodes.filter((n) => parseNodeId(n.id).clickupId === activeTeamId)
          : allWorkspaceNodes;

        for (const node of workspaceNodes) bootCache.set(node.id, node);

        const wsIds =
          scope.mode === "all"
            ? workspaceNodes.map((n) => n.id)
            : [makeNodeId("workspace", scope.teamId)];

        for (const wsId of wsIds) bootExpanded.add(wsId);

        // Prefetch members for the Scope dropdown (selected workspace only).
        const allMembers: MemberOption[] = [];
        for (const wsId of workspaceNodes.map((n) => n.id)) {
          const { clickupId } = parseNodeId(wsId);
          try {
            const res = await fetch(`/api/clickup/workspaces/${clickupId}/members`);
            if (!res.ok) continue;
            const data = await res.json();
            const opts: MemberOption[] = (data.nodes as NodeRecord[]).map((n) => ({
              teamId: clickupId,
              userId: n.data.clickupId,
              label: n.data.label,
              profilePicture:
                (n.data.assignees?.[0]?.profilePicture as string | null | undefined) ??
                null,
            }));
            allMembers.push(...opts);
          } catch {
            // ignore
          }
        }
        if (!cancelled) setMembers(allMembers.sort((a, b) => a.label.localeCompare(b.label)));

        for (const wsId of wsIds) {
          try {
            const children = await fetchChildren(wsId);
            if (cancelled) return;
            mergeChildrenIntoCache(bootCache, wsId, children);
          } catch (err) {
            if (!cancelled) {
              setError(err instanceof Error ? err.message : "Failed to load spaces");
            }
          }
        }

        if (scope.mode === "member") {
          const memberId = makeNodeId("member", scope.userId);
          bootCache.set(memberId, {
            id: memberId,
            data: {
              type: "member",
              clickupId: scope.userId,
              parentId: null,
              label: scope.label,
              assignees: scope.profilePicture
                ? [
                    {
                      id: parseInt(scope.userId, 10),
                      username: scope.label,
                      profilePicture: scope.profilePicture,
                    },
                  ]
                : [
                    {
                      id: parseInt(scope.userId, 10),
                      username: scope.label,
                      profilePicture: null,
                    },
                  ],
              workspaceId: scope.teamId,
              hasChildren: true,
              childrenLoaded: false,
            },
          });

          try {
            const memberChildren = await fetchChildren(memberId, {
              workspaceId: scope.teamId,
            });
            if (cancelled) return;
            mergeChildrenIntoCache(bootCache, memberId, memberChildren);
            bootLimits.set(memberId, TASK_PAGE_SIZE);
          } catch {
            // ignore — member scope still usable without children
          }
        }

        // Deep-link: expand the full path (including container leaves) before first paint.
        let restoredId: string | null = null;
        const containerTypes = new Set([
          "workspace",
          "space",
          "folder",
          "list",
          "people",
          "member",
        ]);

        if (path.length > 0) {
          // Expand every ancestor, and the leaf when it's a container (so its children open).
          for (let i = 0; i < path.length; i++) {
            if (cancelled) return;
            const id = path[i]!;
            const isLeaf = i === path.length - 1;
            if (!bootCache.has(id)) break;

            const record = bootCache.get(id)!;
            const shouldOpen = !isLeaf || containerTypes.has(record.data.type);
            if (!shouldOpen) continue;

            if (!record.data.childrenLoaded) {
              try {
                const { type } = parseNodeId(id);
                const workspaceId = record.data.workspaceId as string | undefined;
                const children = await fetchChildren(
                  id,
                  type === "member" ? { workspaceId } : undefined,
                );
                if (cancelled) return;
                mergeChildrenIntoCache(bootCache, id, children);
                if (type === "list" || type === "member") {
                  bootLimits.set(id, Math.max(bootLimits.get(id) ?? 0, TASK_PAGE_SIZE));
                }
              } catch {
                break;
              }
            }

            bootExpanded.add(id);

            // Keep a deep-linked task visible if it sits past the first page.
            const nextId = path[i + 1];
            const opened = bootCache.get(id);
            if (
              nextId &&
              opened &&
              (opened.data.type === "list" || opened.data.type === "member") &&
              bootCache.has(nextId)
            ) {
              const siblings = [...bootCache.values()]
                .filter((r) => r.data.parentId === id && r.data.type === "task")
                .sort((a, b) => a.data.label.localeCompare(b.data.label));
              const idx = siblings.findIndex((r) => r.id === nextId);
              if (idx >= 0) {
                bootLimits.set(id, Math.max(bootLimits.get(id) ?? TASK_PAGE_SIZE, idx + 1));
              }
            }
          }

          const leaf = path[path.length - 1]!;
          if (
            bootCache.has(leaf) &&
            isRestorableSelection(leaf, bootCache, scope, adminUnlocked)
          ) {
            restoredId = leaf;
          }
        }

        if (cancelled) return;

        setCache(bootCache);
        cacheRef.current = bootCache;
        setExpandedIds(bootExpanded);
        setTaskVisibleLimits(bootLimits);

        if (restoredId) {
          setSelectedId(restoredId);
          const leafType = bootCache.get(restoredId)?.data.type;
          focusAfterLayoutRef.current = {
            nodeId: restoredId,
            mode: leafType && containerTypes.has(leafType) ? "subtree" : "self",
          };
          fitOnNextLayout.current = false;
          writeMindmapPath(pathIdsFromSelection(restoredId, bootCache));
          const label = bootCache.get(restoredId)?.data.label;
          document.title = label ? `${label} · Odin Mindmap` : "Odin Mindmap";
        } else {
          setSelectedId(null);
          fitOnNextLayout.current = true;
          if (path.length > 0) {
            // Stale / out-of-scope deep link — drop it so we don't loop on a bad path.
            writeMindmapPath([]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load workspaces");
          restoreAttemptedRef.current = true;
        }
      } finally {
        if (!cancelled && !deferLoading) {
          restoreAttemptedRef.current = true;
          setInitialLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [scope, adminUnlocked, activeTeamId, wsLoading, resetGraph, setTeamId, urlEpoch]);

  // Auto fit / recenter after layout changes
  useEffect(() => {
    if (nodes.length === 0) return;

    requestAnimationFrame(() => {
      if (focusAfterLayoutRef.current) {
        const { nodeId, mode } = focusAfterLayoutRef.current;
        focusAfterLayoutRef.current = null;

        if (mode === "subtree") {
          const ids = getSubtreeNodeIds(nodeId, nodes, edges);
          fitView({
            nodes: ids.map((id) => ({ id })),
            padding: 0.3,
            duration: 400,
            maxZoom: 1.1,
          });
        } else {
          const ids = getAncestorIds(nodeId, cacheRef.current);
          fitView({
            nodes: ids.map((id) => ({ id })),
            padding: 0.35,
            duration: 400,
            maxZoom: 1.2,
          });
        }
      } else if (fitOnNextLayout.current) {
        fitOnNextLayout.current = false;
        fitView({ padding: 0.2, duration: 300 });
      }
    });
  }, [nodes, edges, fitView]);

  const loadChildren = useCallback(async (
    nodeId: string,
    opts?: { quiet?: boolean },
  ): Promise<boolean> => {
    let shouldLoad = false;
    let loadEstimate: number | undefined;

    setCache((prev) => {
      const record = prev.get(nodeId);
      if (!record || record.data.childrenLoaded) return prev;
      shouldLoad = true;
      loadEstimate = record.data.loadEstimate;
      return prev;
    });

    if (!shouldLoad) return true;

    const { type } = parseNodeId(nodeId);

    if (
      !opts?.quiet &&
      type === "list" &&
      loadEstimate != null &&
      loadEstimate > LARGE_LIST_THRESHOLD
    ) {
      const confirmed = window.confirm(
        `This list has ${loadEstimate} tasks. Loading may take a moment. Continue?`,
      );
      if (!confirmed) return false;
    }

    setLoadingIds((prev) => cloneSet(prev).add(nodeId));

    try {
      const record = cacheRef.current.get(nodeId);
      const workspaceId = record?.data.workspaceId as string | undefined;
      const children = await fetchChildren(
        nodeId,
        type === "member" ? { workspaceId } : undefined,
      );

      setCache((prev) => {
        const next = new Map(prev);
        const parent = next.get(nodeId);
        if (parent) {
          const directCount = children.filter((c) => c.data.parentId === nodeId).length;
          next.set(nodeId, {
            ...parent,
            data: {
              ...parent.data,
              childrenLoaded: true,
              childCount: directCount > 0 ? directCount : undefined,
            },
          });
        }
        for (const child of children) {
          if (!next.has(child.id)) {
            next.set(child.id, child);
          }
        }
        cacheRef.current = next;
        return next;
      });

      if (type === "list" || type === "member") {
        setTaskVisibleLimits((prev) => {
          const next = new Map(prev);
          next.set(nodeId, TASK_PAGE_SIZE);
          return next;
        });
      }

      return true;
    } catch (err) {
      if (!opts?.quiet) {
        setError(err instanceof Error ? err.message : "Failed to load children");
      }
      return false;
    } finally {
      setLoadingIds((prev) => {
        const next = cloneSet(prev);
        next.delete(nodeId);
        return next;
      });
    }
  }, []);

  // Keep the URL in sync with the current selection (shareable + refresh-safe).
  useEffect(() => {
    if (initialLoading || !restoreAttemptedRef.current) return;

    if (!selectedId) {
      writeMindmapPath([]);
      document.title = "Odin Mindmap";
      return;
    }

    const path = pathIdsFromSelection(selectedId, cacheRef.current);
    if (path.length === 0) return;
    writeMindmapPath(path);

    const label = cacheRef.current.get(selectedId)?.data.label;
    document.title = label ? `${label} · Odin Mindmap` : "Odin Mindmap";
  }, [selectedId, initialLoading]);

  const loadMoreTasks = useCallback((listNodeId: string) => {
    setTaskVisibleLimits((prev) => {
      const next = new Map(prev);
      next.set(listNodeId, (next.get(listNodeId) ?? TASK_PAGE_SIZE) + TASK_PAGE_SIZE);
      return next;
    });
    focusAfterLayoutRef.current = { nodeId: listNodeId, mode: "subtree" };
  }, []);

  const toggleExpand = useCallback(
    async (nodeId: string) => {
      const record = cacheRef.current.get(nodeId);
      const canExpandAsAdmin =
        adminUnlocked && record && isTaskType(record.data.type) && Boolean(record.data.listId);
      if (!record?.data.hasChildren && !canExpandAsAdmin) return;

      const isExpanded = expandedIds.has(nodeId);

      if (isExpanded) {
        setExpandedIds((prev) => {
          const next = cloneSet(prev);
          next.delete(nodeId);
          return next;
        });
        focusAfterLayoutRef.current = { nodeId, mode: "self" };
        return;
      }

      if (!record.data.childrenLoaded) {
        const loaded = await loadChildren(nodeId);
        if (!loaded) return;
      }

      setExpandedIds((prev) => cloneSet(prev).add(nodeId));
      focusAfterLayoutRef.current = { nodeId, mode: "subtree" };
    },
    [expandedIds, loadChildren, adminUnlocked],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      const target = event.target as HTMLElement;

      if (target.closest("[data-load-more]")) {
        const listParentId = (node.data as MindMapNodeData).listParentId;
        if (listParentId) loadMoreTasks(listParentId);
        return;
      }

      const nodeData = node.data as MindMapNodeData;

      if (target.closest("[data-add-inline]")) {
        if (nodeData.addTaskListId) {
          if (!expandedIds.has(node.id)) {
            void toggleExpand(node.id);
          }
          setCreateTaskContext({
            listId: nodeData.addTaskListId,
            parentNodeId: node.id,
            parentTaskId: nodeData.addTaskParentTaskId,
            title: nodeData.addTaskParentTaskId ? "New subtask" : "New task",
          });
          setSelectedId(node.id);
        }
        return;
      }

      if (nodeData.type === "loadmore") return;

      if (nodeData.hasChildren) {
        toggleExpand(node.id);
      }

      setSelectedId(node.id);
    },
    [toggleExpand, loadMoreTasks, expandedIds],
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const type = (node.data as MindMapNodeData).type;
      if (type === "loadmore") return;
      toggleExpand(node.id);
    },
    [toggleExpand],
  );

  useKeyboardShortcuts({
    onZoomIn: () => zoomIn({ duration: 200 }),
    onZoomOut: () => zoomOut({ duration: 200 }),
    onFitView: () => fitView({ padding: 0.2, duration: 300 }),
    onDeselect: () => setSelectedId(null),
    onToggleExpand: () => {
      if (selectedId) toggleExpand(selectedId);
    },
  });

  const handleNodeUpdate = useCallback((nodeId: string, data: MindMapNodeData) => {
    setCache((prev) => {
      const next = new Map(prev);
      const record = next.get(nodeId);
      if (record) {
        next.set(nodeId, { ...record, data });
      }
      return next;
    });
  }, []);

  const handleTaskCreated = useCallback(
    async ({ name, assigneeIds }: { name: string; assigneeIds: number[] }) => {
      if (!createTaskContext) return;

      const { listId, parentNodeId, parentTaskId } = createTaskContext;
      const { node: created } = await createTask(listId, {
        name,
        parent: parentTaskId,
        assignees: assigneeIds,
      });

      const newRecord: NodeRecord = {
        id: created.id,
        data: {
          ...created.data,
          parentId: created.data.parentId ?? parentNodeId,
        },
      };

      setCache((prev) => {
        const next = new Map(prev);
        next.set(newRecord.id, newRecord);

        const parent = next.get(parentNodeId);
        if (parent) {
          const childCount = (parent.data.childCount ?? 0) + 1;
          next.set(parentNodeId, {
            ...parent,
            data: {
              ...parent.data,
              hasChildren: true,
              childCount,
            },
          });
        }

        return next;
      });

      setExpandedIds((prev) => cloneSet(prev).add(parentNodeId));
      setSelectedId(newRecord.id);
      focusAfterLayoutRef.current = { nodeId: parentNodeId, mode: "subtree" };
    },
    [createTaskContext],
  );

  const handleTaskDeleted = useCallback(async (nodeId: string) => {
    const record = cacheRef.current.get(nodeId);
    if (!record || !isTaskType(record.data.type)) return;

    await deleteTask(record.data.clickupId);

    setCache((prev) => {
      const next = new Map(prev);
      const toRemove = new Set<string>([nodeId]);

      let added = true;
      while (added) {
        added = false;
        for (const [id, rec] of next) {
          if (rec.data.parentId && toRemove.has(rec.data.parentId) && !toRemove.has(id)) {
            toRemove.add(id);
            added = true;
          }
        }
      }

      for (const id of toRemove) next.delete(id);

      const parentId = record.data.parentId;
      if (parentId) {
        const parent = next.get(parentId);
        if (parent) {
          const remaining = [...next.values()].filter((r) => r.data.parentId === parentId).length;
          next.set(parentId, {
            ...parent,
            data: {
              ...parent.data,
              childCount: remaining > 0 ? remaining : undefined,
              hasChildren: remaining > 0 || (adminUnlocked && isTaskType(parent.data.type)),
            },
          });
        }
      }

      return next;
    });

    setSelectedId(null);
  }, [adminUnlocked]);

  const handleAddSubtask = useCallback(
    async (parentNodeId: string, name: string, assignees: number[] = []) => {
      const parent = cacheRef.current.get(parentNodeId);
      const listId = parent?.data.listId as string | undefined;
      if (!parent || !listId || !isTaskType(parent.data.type)) {
        throw new Error("Cannot add subtask to this node");
      }

      const { node: created } = await createTask(listId, {
        name,
        parent: parent.data.clickupId,
        assignees,
      });

      const newRecord: NodeRecord = {
        id: created.id,
        data: {
          ...created.data,
          parentId: created.data.parentId ?? parentNodeId,
        },
      };

      setCache((prev) => {
        const next = new Map(prev);
        next.set(newRecord.id, newRecord);
        const childCount = (parent.data.childCount ?? 0) + 1;
        next.set(parentNodeId, {
          ...parent,
          data: {
            ...parent.data,
            hasChildren: true,
            childCount,
          },
        });
        return next;
      });

      setExpandedIds((prev) => cloneSet(prev).add(parentNodeId));
      setSelectedId(newRecord.id);
      focusAfterLayoutRef.current = { nodeId: parentNodeId, mode: "subtree" };
    },
    [],
  );

  return (
    <div className="flex h-screen flex-col">
      <MindMapToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onZoomIn={() => zoomIn({ duration: 200 })}
        onZoomOut={() => zoomOut({ duration: 200 })}
        onFitView={() => fitView({ padding: 0.2, duration: 300 })}
        workspaces={workspaces}
        activeTeamId={activeTeamId}
        wsLoading={wsLoading}
        onTeamChange={handleTeamChange}
        scope={scope}
        onScopeChange={handleScopeChange}
        adminUnlocked={adminUnlocked}
        onAdminUnlock={unlockAdmin}
        onAdminLock={() => void lockAdmin()}
        members={members}
      />

      {error && (
        <div className="flex items-center justify-between gap-4 border-b border-red-200/60 bg-red-50/80 px-5 py-2.5 text-sm text-red-700 backdrop-blur-sm dark:border-red-900/40 dark:bg-red-950/50 dark:text-red-300">
          <span className="font-medium">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 rounded-lg px-2 py-1 text-red-500 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <div className="relative flex-1 min-h-0">
          {initialLoading ? (
            <div className="canvas-bg flex h-full flex-col items-center justify-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
              <p className="text-sm font-medium text-[var(--muted)]">{loadingMessage}</p>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              fitView
              minZoom={0.05}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
              onlyRenderVisibleElements
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              className="canvas-bg"
            >
              <svg style={{ position: "absolute", width: 0, height: 0 }}>
                <defs>
                  <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <Background gap={24} size={1.5} color="var(--dot-color)" />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}
        </div>

        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            readOnly={!adminUnlocked}
            onClose={() => setSelectedId(null)}
            onUpdate={handleNodeUpdate}
            members={activeTeamId ? members.filter((m) => m.teamId === activeTeamId) : members}
            onDelete={
              adminUnlocked && isTaskType(selectedNode.data.type)
                ? () => handleTaskDeleted(selectedNode.id)
                : undefined
            }
            onAddSubtask={
              adminUnlocked &&
              isTaskType(selectedNode.data.type) &&
              selectedNode.data.listId
                ? (name) => handleAddSubtask(selectedNode.id, name)
                : undefined
            }
          />
        )}
      </div>

      <CreateTaskDialog
        open={createTaskContext !== null}
        title={createTaskContext?.title ?? "New task"}
        onClose={() => setCreateTaskContext(null)}
        onCreate={handleTaskCreated}
        members={activeTeamId ? members.filter((m) => m.teamId === activeTeamId) : members}
      />
    </div>
  );
}

export function MindMapCanvas() {
  return (
    <ReactFlowProvider>
      <MindMapCanvasInner />
    </ReactFlowProvider>
  );
}
