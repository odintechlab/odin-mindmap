"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { PersonNode } from "./nodes/PersonNode";
import { ProjectNode } from "./nodes/ProjectNode";
import { NetworkDetailPanel } from "./NetworkDetailPanel";
import { fetchNetworkGraph } from "@/lib/network/api";
import { layoutNetworkNodes } from "@/lib/network/layout";
import { fetchWorkspaces } from "@/lib/mindmap/api";
import type {
  NetworkEdge,
  NetworkGraph,
  NetworkNode,
  NetworkViewMode,
} from "@/types/network";

const nodeTypes = { person: PersonNode, project: ProjectNode };

const MAX_EDGE_STROKE = 5;

function edgeStrokeWidth(weight: number, maxWeight: number) {
  if (maxWeight <= 1) return 1.5;
  return 1 + (Math.min(weight, maxWeight) / maxWeight) * (MAX_EDGE_STROKE - 1);
}

function getNeighbors(nodeId: string, edges: NetworkEdge[]): Set<string> {
  const neighbors = new Set<string>([nodeId]);
  for (const e of edges) {
    if (e.source === nodeId) neighbors.add(e.target);
    if (e.target === nodeId) neighbors.add(e.source);
  }
  return neighbors;
}

function filterGraph(
  graph: NetworkGraph,
  opts: {
    search: string;
    collabOnly: boolean;
  },
): { nodes: NetworkNode[]; edges: NetworkEdge[] } {
  let { nodes, edges } = graph;

  if (opts.collabOnly) {
    edges = edges.filter((e) => e.kind === "collab" && e.weight >= 1);
    const connected = new Set<string>();
    for (const e of edges) {
      connected.add(e.source);
      connected.add(e.target);
    }
    nodes = nodes.filter((n) => n.type === "person" && connected.has(n.id));
  }

  const q = opts.search.trim().toLowerCase();
  if (q) {
    const matching = new Set(
      nodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id),
    );
    nodes = nodes.filter((n) => matching.has(n.id));
    edges = edges.filter(
      (e) => matching.has(e.source) && matching.has(e.target),
    );
  }

  return { nodes, edges };
}

interface NetworkCanvasProps {
  teamId: string;
  viewMode: NetworkViewMode;
  search: string;
  collabOnly: boolean;
}

function NetworkCanvasInner({
  teamId,
  viewMode,
  search,
  collabOnly,
}: NetworkCanvasProps) {
  const { fitView } = useReactFlow();
  const [graph, setGraph] = useState<NetworkGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const layoutCache = useRef<Map<string, Map<string, { x: number; y: number }>>>(
    new Map(),
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setGraph(null);
    setFocusedId(null);
    setHoveredId(null);

    fetchNetworkGraph(teamId)
      .then((data) => {
        if (!cancelled) setGraph(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load network");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const filtered = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    return filterGraph(graph, { search, collabOnly });
  }, [graph, search, collabOnly, viewMode]);

  const positions = useMemo(() => {
    const cacheKey = `${teamId}:${viewMode}:${filtered.nodes.map((n) => n.id).join(",")}`;
    const cached = layoutCache.current.get(cacheKey);
    if (cached) return cached;

    const layout = layoutNetworkNodes(filtered.nodes, viewMode);
    layoutCache.current.set(cacheKey, layout);
    return layout;
  }, [teamId, viewMode, filtered.nodes]);

  const maxWeights = useMemo(() => {
    let collab = 1;
    let membership = 1;
    for (const e of filtered.edges) {
      if (e.kind === "collab") collab = Math.max(collab, e.weight);
      else membership = Math.max(membership, e.weight);
    }
    return { collab, membership };
  }, [filtered.edges]);

  const highlightSet = useMemo(() => {
    if (!hoveredId && !focusedId) return null;
    const id = hoveredId ?? focusedId;
    if (!id) return null;
    return getNeighbors(id, filtered.edges);
  }, [hoveredId, focusedId, filtered.edges]);

  const flowNodes: Node[] = useMemo(() => {
    return filtered.nodes.map((n) => {
      const pos = positions.get(n.id) ?? { x: 0, y: 0 };
      const inHighlight = highlightSet?.has(n.id) ?? false;
      const dimmed = highlightSet != null && !inHighlight;
      const focused = focusedId === n.id;
      const highlighted = hoveredId === n.id || (highlightSet != null && inHighlight && hoveredId != null);

      const base = {
        id: n.id,
        type: n.type,
        position: pos,
        draggable: false,
        selectable: true,
      };

      if (n.type === "person") {
        return {
          ...base,
          data: {
            label: n.label,
            profilePicture: n.meta?.profilePicture,
            dimmed,
            highlighted,
            focused,
          },
        };
      }

      return {
        ...base,
        data: {
          label: n.label,
          taskCount: n.meta?.taskCount,
          dimmed,
          highlighted,
          focused,
        },
      };
    });
  }, [filtered.nodes, positions, highlightSet, hoveredId, focusedId]);

  const flowEdges: Edge[] = useMemo(() => {
    return filtered.edges.map((e) => {
      const inHighlight =
        highlightSet == null ||
        (highlightSet.has(e.source) && highlightSet.has(e.target));
      const maxW = e.kind === "collab" ? maxWeights.collab : maxWeights.membership;
      const stroke = e.kind === "collab" ? "var(--accent)" : "var(--border-strong)";
      const opacity = highlightSet == null ? (e.kind === "collab" ? 0.7 : 0.45) : inHighlight ? 0.85 : 0.08;

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        style: {
          stroke,
          strokeWidth: edgeStrokeWidth(e.weight, maxW),
          opacity,
        },
        animated: e.kind === "collab" && inHighlight && highlightSet != null,
      };
    });
  }, [filtered.edges, highlightSet, maxWeights]);

  const focusedNode = focusedId
    ? filtered.nodes.find((n) => n.id === focusedId) ?? null
    : null;

  const focusEgoNetwork = useCallback(
    (nodeId: string) => {
      const neighbors = getNeighbors(nodeId, filtered.edges);
      const egoNodes = flowNodes.filter((n) => neighbors.has(n.id));
      if (egoNodes.length === 0) return;
      fitView({
        nodes: egoNodes,
        padding: 0.35,
        duration: 400,
        maxZoom: 1.5,
      });
    },
    [filtered.edges, flowNodes, fitView],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setFocusedId(node.id);
      focusEgoNetwork(node.id);
    },
    [focusEgoNetwork],
  );

  const onNodeMouseEnter: NodeMouseHandler = useCallback((_event, node) => {
    setHoveredId(node.id);
  }, []);

  const onNodeMouseLeave: NodeMouseHandler = useCallback(() => {
    setHoveredId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setFocusedId(null);
  }, []);

  if (loading) {
    return (
      <div className="canvas-bg flex h-full flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
        <p className="text-sm font-medium text-[var(--muted)]">
          Building network graph…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="canvas-bg flex h-full items-center justify-center px-6">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!graph || filtered.nodes.length === 0) {
    return (
      <div className="canvas-bg flex h-full items-center justify-center px-6">
        <p className="text-sm font-medium text-[var(--muted)]">No nodes to display</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onPaneClick={onPaneClick}
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
          <Background gap={24} size={1.5} color="var(--dot-color)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {focusedNode && (
        <NetworkDetailPanel
          node={focusedNode}
          edges={graph.edges}
          nodes={graph.nodes}
          onClose={() => setFocusedId(null)}
        />
      )}
    </div>
  );
}

export function NetworkCanvas(props: NetworkCanvasProps) {
  return (
    <ReactFlowProvider>
      <NetworkCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export function useNetworkWorkspaces() {
  const [workspaces, setWorkspaces] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaces()
      .then((nodes) => {
        setWorkspaces(
          nodes.map((n) => ({ id: n.data.clickupId, label: n.data.label })),
        );
      })
      .catch(() => setWorkspaces([]))
      .finally(() => setLoading(false));
  }, []);

  return { workspaces, loading };
}
