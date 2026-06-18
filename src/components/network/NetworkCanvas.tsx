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
import { NetworkEdge } from "./edges/NetworkEdge";
import { NetworkDetailPanel } from "./NetworkDetailPanel";
import { NetworkInteractionProvider } from "./NetworkInteractionContext";
import { fetchNetworkGraph } from "@/lib/network/api";
import { layoutNetworkNodes } from "@/lib/network/layout";
import type {
  NetworkEdge as NetworkEdgeType,
  NetworkGraph,
  NetworkNode,
  NetworkViewMode,
} from "@/types/network";

const nodeTypes = { person: PersonNode, project: ProjectNode };
const edgeTypes = { network: NetworkEdge };

function getNeighbors(nodeId: string, edges: NetworkEdgeType[]): Set<string> {
  const neighbors = new Set<string>([nodeId]);
  for (const e of edges) {
    if (e.source === nodeId) neighbors.add(e.target);
    if (e.target === nodeId) neighbors.add(e.source);
  }
  return neighbors;
}

function filterGraph(
  graph: NetworkGraph,
  opts: { search: string; collabOnly: boolean },
): { nodes: NetworkNode[]; edges: NetworkEdgeType[] } {
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

function buildFlowElements(
  nodes: NetworkNode[],
  edges: NetworkEdgeType[],
  positions: Map<string, { x: number; y: number }>,
): { flowNodes: Node[]; flowEdges: Edge[] } {
  let maxCollab = 1;
  let maxMembership = 1;
  for (const e of edges) {
    if (e.kind === "collab") maxCollab = Math.max(maxCollab, e.weight);
    else maxMembership = Math.max(maxMembership, e.weight);
  }

  const flowNodes: Node[] = nodes.map((n) => {
    const pos = positions.get(n.id) ?? { x: 0, y: 0 };
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
        },
      };
    }

    return {
      ...base,
      data: {
        label: n.label,
        taskCount: n.meta?.taskCount,
      },
    };
  });

  const flowEdges: Edge[] = edges.map((e) => ({
    id: e.id,
    type: "network",
    source: e.source,
    target: e.target,
    data: {
      weight: e.weight,
      kind: e.kind,
      maxWeight: e.kind === "collab" ? maxCollab : maxMembership,
    },
  }));

  return { flowNodes, flowEdges };
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
  const { fitView, getNodes } = useReactFlow();
  const [graph, setGraph] = useState<NetworkGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const edgesRef = useRef<NetworkEdgeType[]>([]);
  const initialFitDone = useRef(false);
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
    initialFitDone.current = false;

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
  }, [graph, search, collabOnly]);

  const positions = useMemo(() => {
    const nodeKey = filtered.nodes
      .map((n) => n.id)
      .sort()
      .join(",");
    const cacheKey = `${teamId}:${viewMode}:${nodeKey}`;
    const cached = layoutCache.current.get(cacheKey);
    if (cached) return cached;

    const layout = layoutNetworkNodes(filtered.nodes, viewMode);
    layoutCache.current.set(cacheKey, layout);
    return layout;
  }, [teamId, viewMode, filtered.nodes]);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (filtered.nodes.length === 0) {
      return { flowNodes: [] as Node[], flowEdges: [] as Edge[] };
    }
    return buildFlowElements(filtered.nodes, filtered.edges, positions);
  }, [filtered.nodes, filtered.edges, positions]);

  useEffect(() => {
    edgesRef.current = filtered.edges;
  }, [filtered.edges]);

  useEffect(() => {
    initialFitDone.current = false;
  }, [teamId, viewMode, search, collabOnly]);

  useEffect(() => {
    if (flowNodes.length === 0 || initialFitDone.current) return;
    initialFitDone.current = true;
    requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 300 });
    });
  }, [flowNodes, fitView]);

  const activeId = hoveredId ?? focusedId;
  const neighborIds = useMemo(() => {
    if (!activeId) return null;
    return getNeighbors(activeId, filtered.edges);
  }, [activeId, filtered.edges]);

  const focusEgoNetwork = useCallback(
    (nodeId: string) => {
      const neighbors = getNeighbors(nodeId, edgesRef.current);
      const egoNodes = getNodes().filter((n) => neighbors.has(n.id));
      if (egoNodes.length === 0) return;
      fitView({
        nodes: egoNodes,
        padding: 0.35,
        duration: 400,
        maxZoom: 1.5,
      });
    },
    [getNodes, fitView],
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

  const focusedNode = focusedId
    ? filtered.nodes.find((n) => n.id === focusedId) ?? null
    : null;

  if (loading) {
    return (
      <div className="canvas-bg flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
        <p className="text-sm font-medium text-[var(--muted)]">
          Building network graph…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="canvas-bg flex h-full min-h-0 flex-1 items-center justify-center px-6">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!graph || filtered.nodes.length === 0) {
    return (
      <div className="canvas-bg flex h-full min-h-0 flex-1 items-center justify-center px-6">
        <p className="text-sm font-medium text-[var(--muted)]">No nodes to display</p>
      </div>
    );
  }

  return (
    <NetworkInteractionProvider
      hoveredId={hoveredId}
      focusedId={focusedId}
      neighborIds={neighborIds}
    >
      <div className="flex h-full min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative h-full min-h-0 flex-1">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={onNodeClick}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onPaneClick={onPaneClick}
            minZoom={0.05}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            onlyRenderVisibleElements
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            elevateNodesOnSelect={false}
            className="canvas-bg"
            style={{ width: "100%", height: "100%" }}
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
    </NetworkInteractionProvider>
  );
}

export function NetworkCanvas(props: NetworkCanvasProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ReactFlowProvider>
        <NetworkCanvasInner key={props.teamId} {...props} />
      </ReactFlowProvider>
    </div>
  );
}

export { useWorkspaces as useNetworkWorkspaces } from "@/hooks/useWorkspaces";
