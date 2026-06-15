import type { Node, Edge } from "@xyflow/react";
import type { MindMapNodeData, NodeRecord } from "@/types/mindmap";
import { getPathIds } from "./layout";
import { layoutGraph } from "./layout";

export function buildVisibleGraph(
  cache: Map<string, NodeRecord>,
  expandedIds: Set<string>,
  selectedId: string | null,
  loadingIds: Set<string>,
): { nodes: Node<MindMapNodeData>[]; edges: Edge[] } {
  const pathIds = getPathIds(selectedId, cache);
  const visibleIds = new Set<string>();

  function collectVisible(id: string) {
    visibleIds.add(id);
    if (!expandedIds.has(id)) return;

    for (const [childId, record] of cache) {
      if (record.data.parentId === id) {
        collectVisible(childId);
      }
    }
  }

  // Start from root nodes (no parent)
  for (const [id, record] of cache) {
    if (record.data.parentId === null) {
      collectVisible(id);
    }
  }

  const edges: Edge[] = [];
  const rawNodes: Node<MindMapNodeData>[] = [];

  for (const id of visibleIds) {
    const record = cache.get(id);
    if (!record) continue;

    const data: MindMapNodeData = {
      ...record.data,
      isOnPath: pathIds.has(id),
      isSelected: id === selectedId,
      isExpanded: expandedIds.has(id),
      isLoading: loadingIds.has(id),
    };

    rawNodes.push({
      id,
      type: "mindmap",
      data,
      position: { x: 0, y: 0 },
    });

    if (record.data.parentId && visibleIds.has(record.data.parentId)) {
      edges.push({
        id: `${record.data.parentId}->${id}`,
        source: record.data.parentId,
        target: id,
        className: pathIds.has(id) && pathIds.has(record.data.parentId)
          ? "path-highlight"
          : undefined,
      });
    }
  }

  const nodes = layoutGraph(rawNodes, edges);
  return { nodes, edges };
}

export function getBreadcrumb(
  selectedId: string | null,
  cache: Map<string, NodeRecord>,
): NodeRecord[] {
  if (!selectedId) return [];
  const crumbs: NodeRecord[] = [];
  let current: string | null = selectedId;

  while (current) {
    const record = cache.get(current);
    if (!record) break;
    crumbs.unshift(record);
    current = record.data.parentId;
  }

  return crumbs;
}
