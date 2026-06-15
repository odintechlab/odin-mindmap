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
import { fetchWorkspaces, fetchChildren } from "@/lib/mindmap/api";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { parseNodeId, type MindMapNodeData, type NodeRecord } from "@/types/mindmap";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const fitOnNextLayout = useRef(false);
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const selectedNode = selectedId ? cache.get(selectedId) ?? null : null;
  const breadcrumbs = useMemo(
    () => getBreadcrumb(selectedId, cache),
    [selectedId, cache],
  );

  const { nodes, edges } = useMemo(
    () => buildVisibleGraph(cache, expandedIds, selectedId, loadingIds),
    [cache, expandedIds, selectedId, loadingIds],
  );

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

  // Fit view after layout updates
  useEffect(() => {
    if (fitOnNextLayout.current && nodes.length > 0) {
      fitOnNextLayout.current = false;
      requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }));
    }
  }, [nodes, fitView]);

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
      const children = await fetchChildren(nodeId);

      setCache((prev) => {
        const next = new Map(prev);
        const parent = next.get(nodeId);
        if (parent) {
          next.set(nodeId, {
            ...parent,
            data: { ...parent.data, childrenLoaded: true },
          });
        }
        for (const child of children) {
          next.set(child.id, child);
        }
        return next;
      });

      fitOnNextLayout.current = true;
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
        return;
      }

      if (!record.data.childrenLoaded) {
        const loaded = await loadChildren(nodeId);
        if (!loaded) return;
      }

      setExpandedIds((prev) => cloneSet(prev).add(nodeId));
    },
    [expandedIds, loadChildren],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-expand-toggle]")) {
        toggleExpand(node.id);
        return;
      }
      setSelectedId(node.id);
    },
    [toggleExpand],
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
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
        onZoomIn={() => zoomIn({ duration: 200 })}
        onZoomOut={() => zoomOut({ duration: 200 })}
        onFitView={() => fitView({ padding: 0.2, duration: 300 })}
        onCenterSelected={centerSelected}
      />

      {error && (
        <div className="flex items-center justify-between gap-4 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <div className="relative flex-1 min-h-0">
          {initialLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              Loading workspaces…
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              fitView
              minZoom={0.1}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
              onlyRenderVisibleElements
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              className="bg-[var(--background)]"
            >
              <Background gap={20} size={1} color="var(--border)" />
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
