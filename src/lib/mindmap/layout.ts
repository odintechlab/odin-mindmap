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
const SUBTASK_GAP_X = 28;
const SUBTASK_GAP_Y = 14;

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

function getPosition(
  id: string,
  byId: Map<string, Node<MindMapNodeData>>,
  repositioned: Map<string, { x: number; y: number }>,
): { x: number; y: number } {
  return repositioned.get(id) ?? byId.get(id)!.position;
}

/** True when another task occupies the space immediately to the right of parent. */
function hasRoomOnRight(
  parent: Node<MindMapNodeData>,
  parentPos: { x: number; y: number },
  byId: Map<string, Node<MindMapNodeData>>,
  nodes: Node<MindMapNodeData>[],
  repositioned: Map<string, { x: number; y: number }>,
): boolean {
  const dim = nodeDimensions(parent.data);
  const neededRight = parentPos.x + dim.width + SUBTASK_GAP_X + NODE_WIDTH_COMPACT;

  for (const n of nodes) {
    if (n.id === parent.id || n.data.type === "subtask" || n.data.type === "loadmore") continue;
    if (n.data.type !== "task") continue;

    const nPos = getPosition(n.id, byId, repositioned);
    const nDim = nodeDimensions(n.data);
    const sameRow = Math.abs(nPos.y - parentPos.y) < Math.max(dim.height, nDim.height) * 0.75;
    if (!sameRow) continue;

    if (nPos.x > parentPos.x && nPos.x < neededRight) return false;
  }
  return true;
}

/** Place subtasks to the right or above the parent depending on available space. */
function applySubtaskLayout(
  nodes: Node<MindMapNodeData>[],
  edges: Edge[],
): Node<MindMapNodeData>[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const subtasksByParent = new Map<string, string[]>();

  for (const edge of edges) {
    const child = byId.get(edge.target);
    if (!child || child.data.type !== "subtask") continue;
    const list = subtasksByParent.get(edge.source) ?? [];
    list.push(edge.target);
    subtasksByParent.set(edge.source, list);
  }

  if (subtasksByParent.size === 0) return nodes;

  const repositioned = new Map<string, { x: number; y: number }>();

  function parentDepth(parentId: string): number {
    let depth = 0;
    let cur = byId.get(parentId);
    while (cur?.data.parentId) {
      const p = byId.get(cur.data.parentId);
      if (!p || (p.data.type !== "task" && p.data.type !== "subtask")) break;
      depth++;
      cur = p;
    }
    return depth;
  }

  function stackYAboveParent(
    parentPos: { x: number; y: number },
    stackHeight: number,
    parentId: string,
  ): number {
    let y = parentPos.y - SUBTASK_GAP_Y - stackHeight;
    const colLeft = parentPos.x - 8;
    const colRight = parentPos.x + NODE_WIDTH + 8;

    for (const n of nodes) {
      if (n.id === parentId || n.data.type === "subtask" || n.data.type === "loadmore") continue;
      const nPos = getPosition(n.id, byId, repositioned);
      const nDim = nodeDimensions(n.data);
      const inColumn = nPos.x < colRight && nPos.x + nDim.width > colLeft;
      if (!inColumn || nPos.y >= parentPos.y) continue;

      const stackBottom = y + stackHeight;
      if (stackBottom > nPos.y - SUBTASK_GAP_Y) {
        y = nPos.y - SUBTASK_GAP_Y - stackHeight;
      }
    }
    return y;
  }

  const parentIds = [...subtasksByParent.keys()].sort(
    (a, b) => parentDepth(a) - parentDepth(b),
  );

  for (const parentId of parentIds) {
    const parent = byId.get(parentId);
    if (!parent) continue;

    const subtaskIds = subtasksByParent.get(parentId)!.sort((a, b) =>
      byId.get(a)!.data.label.localeCompare(byId.get(b)!.data.label),
    );

    const parentPos = getPosition(parentId, byId, repositioned);
    const parentDim = nodeDimensions(parent.data);
    const placeRight = hasRoomOnRight(parent, parentPos, byId, nodes, repositioned);

    if (placeRight) {
      const startX = parentPos.x + parentDim.width + SUBTASK_GAP_X;
      let y = parentPos.y;
      for (const subId of subtaskIds) {
        const dim = nodeDimensions(byId.get(subId)!.data);
        repositioned.set(subId, { x: startX, y });
        y += dim.height + SUBTASK_GAP_Y;
      }
    } else {
      const totalHeight = subtaskIds.reduce((sum, id, i) => {
        const h = nodeDimensions(byId.get(id)!.data).height;
        return sum + h + (i > 0 ? SUBTASK_GAP_Y : 0);
      }, 0);
      const y = stackYAboveParent(parentPos, totalHeight, parentId);
      const x = parentPos.x;
      let cursorY = y;
      for (const subId of subtaskIds) {
        const dim = nodeDimensions(byId.get(subId)!.data);
        repositioned.set(subId, { x, y: cursorY });
        cursorY += dim.height + SUBTASK_GAP_Y;
      }
    }
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
  laidOut = applySubtaskLayout(laidOut, edges);
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
