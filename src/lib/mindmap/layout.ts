import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  NODE_HEIGHT_COMPACT,
  NODE_WIDTH_COMPACT,
  TASK_GRID_THRESHOLD,
  TASK_GRID_COLS,
} from "./constants";
import type { MindMapNodeData } from "@/types/mindmap";

const GRID_GAP_X = 24;
const GRID_GAP_Y = 16;
const RANK_OFFSET_X = 280;

function nodeDimensions(data: MindMapNodeData): { width: number; height: number } {
  if (data.compact || data.type === "loadmore") {
    return { width: NODE_WIDTH_COMPACT, height: data.type === "loadmore" ? 44 : NODE_HEIGHT_COMPACT };
  }
  if (data.type === "task" || data.type === "subtask") {
    return { width: NODE_WIDTH, height: NODE_HEIGHT };
  }
  return { width: NODE_WIDTH, height: NODE_HEIGHT - 8 };
}

/** Re-position direct task children of a list into a multi-column grid */
function applyTaskGridLayout(
  nodes: Node<MindMapNodeData>[],
  edges: Edge[],
): Node<MindMapNodeData>[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = new Map<string, string[]>();

  for (const edge of edges) {
    const child = byId.get(edge.target);
    if (!child) continue;
    const list = childrenByParent.get(edge.source) ?? [];
    list.push(edge.target);
    childrenByParent.set(edge.source, list);
  }

  const repositioned = new Map<string, { x: number; y: number }>();

  for (const [parentId, childIds] of childrenByParent) {
    const parent = byId.get(parentId);
    if (!parent || (parent.data.type !== "list" && parent.data.type !== "member")) continue;

    const taskChildren = childIds.filter((id) => {
      const n = byId.get(id);
      return n && (n.data.type === "task" || n.data.type === "loadmore");
    });

    if (taskChildren.length < TASK_GRID_THRESHOLD) continue;

    const cols = TASK_GRID_COLS;
    const parentDim = nodeDimensions(parent.data);
    const startX = parent.position.x + parentDim.width + RANK_OFFSET_X;

    const rowHeights: number[] = [];
    taskChildren.forEach((childId, index) => {
      const child = byId.get(childId)!;
      const dim = nodeDimensions(child.data);
      const row = Math.floor(index / cols);
      rowHeights[row] = Math.max(rowHeights[row] ?? 0, dim.height);
    });

    const totalRows = Math.ceil(taskChildren.length / cols);
    const gridHeight =
      rowHeights.reduce((sum, h, i) => sum + h + (i > 0 ? GRID_GAP_Y : 0), 0);
    const gridStartY = parent.position.y + parentDim.height / 2 - gridHeight / 2;

    taskChildren.forEach((childId, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      let y = gridStartY;
      for (let r = 0; r < row; r++) {
        y += rowHeights[r] + GRID_GAP_Y;
      }

      const x = startX + col * (NODE_WIDTH_COMPACT + GRID_GAP_X);
      repositioned.set(childId, { x, y });
    });
  }

  return nodes.map((node) => {
    const pos = repositioned.get(node.id);
    if (!pos) return node;
    return { ...node, position: pos };
  });
}

export function layoutGraph(
  nodes: Node<MindMapNodeData>[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR",
): Node<MindMapNodeData>[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 80 });

  for (const node of nodes) {
    const dim = nodeDimensions(node.data);
    g.setNode(node.id, { width: dim.width, height: dim.height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  let laidOut = nodes.map((node) => {
    const pos = g.node(node.id);
    const dim = nodeDimensions(node.data);
    return {
      ...node,
      position: {
        x: pos.x - dim.width / 2,
        y: pos.y - dim.height / 2,
      },
    };
  });

  laidOut = applyTaskGridLayout(laidOut, edges);
  return laidOut;
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

/** Collect node id + all visible descendants for fitView */
export function getSubtreeNodeIds(
  rootId: string,
  nodes: Node<MindMapNodeData>[],
  edges: Edge[],
): string[] {
  const childMap = new Map<string, string[]>();
  for (const edge of edges) {
    const list = childMap.get(edge.source) ?? [];
    list.push(edge.target);
    childMap.set(edge.source, list);
  }

  const result: string[] = [];
  const queue = [rootId];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (nodes.some((n) => n.id === id)) result.push(id);
    for (const child of childMap.get(id) ?? []) {
      queue.push(child);
    }
  }

  return result;
}

/** Ancestors from root to node (inclusive) */
export function getAncestorIds(
  nodeId: string,
  cache: Map<string, { data: MindMapNodeData }>,
): string[] {
  const ids: string[] = [];
  let current: string | null = nodeId;
  while (current) {
    ids.unshift(current);
    const record = cache.get(current);
    current = record?.data.parentId ?? null;
  }
  return ids;
}
