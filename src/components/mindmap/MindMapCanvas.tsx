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
import { MindMapToolbar } from "./MindMapToolbar";
import { NodeDetailPanel } from "./NodeDetailPanel";
import { buildVisibleGraph, getBreadcrumb } from "@/lib/mindmap/buildGraph";
import { getAncestorIds, getSubtreeNodeIds } from "@/lib/mindmap/layout";
import { TASK_PAGE_SIZE, type TaskStatusFilter } from "@/lib/mindmap/constants";
import { fetchWorkspaces, fetchChildren } from "@/lib/mindmap/api";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { parseNodeId, isTaskType, type MindMapNodeData, type NodeRecord } from "@/types/mindmap";
import { matchesStatusFilter } from "@/lib/mindmap/statusFilter";

const nodeTypes = { mindmap: MindMapNode };

const LARGE_LIST_THRESHOLD = 200;

function cloneSet<T>(set: Set<T>): Set<T> {
  return new Set(set);
}

function MindMapCanvasInner() {
  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();
  const [cache, setCache] = useState<Map<string, NodeRecord>>(new Map());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [taskVisibleLimits, setTaskVisibleLimits] = useState<Map<string, number>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const fitOnNextLayout = useRef(false);
  const focusAfterLayoutRef = useRef<{ nodeId: string; mode: "subtree" | "self" } | null>(null);
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const selectedNode = selectedId ? cache.get(selectedId) ?? null : null;
  const breadcrumbs = useMemo(
    () => getBreadcrumb(selectedId, cache),
    [selectedId, cache],
  );

  const { nodes, edges } = useMemo(
    () =>
      buildVisibleGraph(
        cache,
        expandedIds,
        selectedId,
        loadingIds,
        taskVisibleLimits,
        statusFilter,
      ),
    [cache, expandedIds, selectedId, loadingIds, taskVisibleLimits, statusFilter],
  );

  useEffect(() => {
    if (!selectedId) return;
    const record = cache.get(selectedId);
    if (
      record &&
      isTaskType(record.data.type) &&
      !matchesStatusFilter(record.data, statusFilter)
    ) {
      setSelectedId(null);
    }
  }, [statusFilter, selectedId, cache]);

  // Initial load: workspaces, auto-expand workspace roots
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const workspaceNodes = await fetchWorkspaces();
        if (cancelled) return;

        setCache((prev) => {
          const next = new Map(prev);
          for (const node of workspaceNodes) {
            next.set(node.id, node);
          }
          return next;
        });

        const wsIds = workspaceNodes.map((n) => n.id);
        setExpandedIds(new Set(wsIds));

        for (const wsId of wsIds) {
          setLoadingIds((prev) => cloneSet(prev).add(wsId));
          try {
            const children = await fetchChildren(wsId);
            setCache((prev) => {
              const next = new Map(prev);
              const parent = next.get(wsId);
              if (parent) {
                next.set(wsId, {
                  ...parent,
                  data: { ...parent.data, childrenLoaded: true },
                });
              }
              for (const child of children) {
                next.set(child.id, child);
              }
              return next;
            });
          } catch (err) {
            if (!cancelled) {
              setError(err instanceof Error ? err.message : "Failed to load spaces");
            }
          } finally {
            setLoadingIds((prev) => {
              const next = cloneSet(prev);
              next.delete(wsId);
              return next;
            });
          }
        }

        fitOnNextLayout.current = true;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load workspaces");
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const loadChildren = useCallback(async (nodeId: string): Promise<boolean> => {
    let shouldLoad = false;
    let childCount: number | undefined;

    setCache((prev) => {
      const record = prev.get(nodeId);
      if (!record || record.data.childrenLoaded) return prev;
      shouldLoad = true;
      childCount = record.data.childCount;
      return prev;
    });

    if (!shouldLoad) return true;

    const { type } = parseNodeId(nodeId);

    if (
      type === "list" &&
      childCount != null &&
      childCount > LARGE_LIST_THRESHOLD
    ) {
      const confirmed = window.confirm(
        `This list has ${childCount} tasks. Loading may take a moment. Continue?`,
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
          const taskCount = children.filter((c) => c.data.type === "task").length;
          next.set(nodeId, {
            ...parent,
            data: {
              ...parent.data,
              childrenLoaded: true,
              childCount: type === "member" ? taskCount : parent.data.childCount,
            },
          });
        }
        for (const child of children) {
          if (!next.has(child.id)) {
            next.set(child.id, child);
          }
        }
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
      setError(err instanceof Error ? err.message : "Failed to load children");
      return false;
    } finally {
      setLoadingIds((prev) => {
        const next = cloneSet(prev);
        next.delete(nodeId);
        return next;
      });
    }
  }, []);

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
      if (!record?.data.hasChildren) return;

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
    [expandedIds, loadChildren],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      const target = event.target as HTMLElement;

      if (target.closest("[data-load-more]")) {
        const listParentId = (node.data as MindMapNodeData).listParentId;
        if (listParentId) loadMoreTasks(listParentId);
        return;
      }

      if (target.closest("[data-expand-toggle]")) {
        toggleExpand(node.id);
        return;
      }

      if ((node.data as MindMapNodeData).type === "loadmore") return;

      setSelectedId(node.id);
    },
    [toggleExpand, loadMoreTasks],
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if ((node.data as MindMapNodeData).type === "loadmore") return;
      toggleExpand(node.id);
    },
    [toggleExpand],
  );

  const centerSelected = useCallback(() => {
    if (!selectedId) return;
    const node = nodes.find((n) => n.id === selectedId);
    if (!node) return;
    setCenter(node.position.x + 110, node.position.y + 36, { zoom: 1.2, duration: 300 });
  }, [selectedId, nodes, setCenter]);

  useKeyboardShortcuts({
    onZoomIn: () => zoomIn({ duration: 200 }),
    onZoomOut: () => zoomOut({ duration: 200 }),
    onFitView: () => fitView({ padding: 0.2, duration: 300 }),
    onDeselect: () => setSelectedId(null),
    onToggleExpand: () => {
      if (selectedId) toggleExpand(selectedId);
    },
    onCenterSelected: centerSelected,
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

  return (
    <div className="flex h-screen flex-col">
      <MindMapToolbar
        breadcrumbs={breadcrumbs}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onZoomIn={() => zoomIn({ duration: 200 })}
        onZoomOut={() => zoomOut({ duration: 200 })}
        onFitView={() => fitView({ padding: 0.2, duration: 300 })}
        onCenterSelected={centerSelected}
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
              <p className="text-sm font-medium text-[var(--muted)]">Loading workspaces…</p>
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
            onClose={() => setSelectedId(null)}
            onUpdate={handleNodeUpdate}
          />
        )}
      </div>
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
