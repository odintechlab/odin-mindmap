import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";
import { NODE_HEIGHT, NODE_WIDTH } from "./constants";
import type { MindMapNodeData } from "@/types/mindmap";

export function layoutGraph(
  nodes: Node<MindMapNodeData>[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR",
): Node<MindMapNodeData>[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100 });

  for (const node of nodes) {
    const height =
      node.data.type === "task" || node.data.type === "subtask"
        ? NODE_HEIGHT
        : NODE_HEIGHT - 8;
    g.setNode(node.id, { width: NODE_WIDTH, height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

export function getPathIds(
  selectedId: string | null,
  cache: Map<string, { data: MindMapNodeData }>,
): Set<string> {
  const path = new Set<string>();
  if (!selectedId) return path;

  let current: string | null = selectedId;
  while (current) {
    path.add(current);
    const record = cache.get(current);
    current = record?.data.parentId ?? null;
  }

  return path;
}
