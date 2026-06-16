import type { Node, Edge } from "@xyflow/react";
import type { MindMapNodeData, NodeRecord } from "@/types/mindmap";
import { isTaskType, makeLoadMoreId } from "@/types/mindmap";
import { TASK_PAGE_SIZE, type TaskStatusFilter } from "./constants";
import { getPathIds, layoutGraph } from "./layout";
import { matchesStatusFilter } from "./statusFilter";

function getDirectChildren(
  parentId: string,
  cache: Map<string, NodeRecord>,
): NodeRecord[] {
  const children: NodeRecord[] = [];
  for (const [, record] of cache) {
    if (record.data.parentId === parentId) {
      children.push(record);
    }
  }
  return children.sort((a, b) => a.data.label.localeCompare(b.data.label));
}

function paginateTaskChildren(
  parentId: string,
  cache: Map<string, NodeRecord>,
  taskVisibleLimits: Map<string, number>,
  hiddenByFilter: Set<string>,
): { visible: NodeRecord[]; loadMore: NodeRecord | null; useCompact: boolean } {
  const allTasks = getDirectChildren(parentId, cache).filter(
    (r) => r.data.type === "task" && !hiddenByFilter.has(r.id),
  );

  const limit = taskVisibleLimits.get(parentId) ?? TASK_PAGE_SIZE;
  const visible = allTasks.slice(0, limit);
  const remaining = allTasks.length - visible.length;
  const useCompact = visible.length >= 8;

  let loadMore: NodeRecord | null = null;
  if (remaining > 0) {
    loadMore = {
      id: makeLoadMoreId(parentId),
      data: {
        type: "loadmore",
        clickupId: parentId,
        parentId,
        label: `Show ${remaining} more task${remaining === 1 ? "" : "s"}`,
        listParentId: parentId,
        remainingCount: remaining,
        hasChildren: false,
        childrenLoaded: true,
      },
    };
  }

  return { visible, loadMore, useCompact: useCompact || remaining > 0 };
}

export function buildVisibleGraph(
  cache: Map<string, NodeRecord>,
  expandedIds: Set<string>,
  selectedId: string | null,
  loadingIds: Set<string>,
  taskVisibleLimits: Map<string, number>,
  statusFilter: TaskStatusFilter = "all",
): { nodes: Node<MindMapNodeData>[]; edges: Edge[] } {
  const pathIds = getPathIds(selectedId, cache);
  const visibleIds = new Set<string>();
  const hiddenByPagination = new Set<string>();
  const hiddenByFilter = new Set<string>();

  if (statusFilter !== "all") {
    for (const [id, record] of cache) {
      if (isTaskType(record.data.type) && !matchesStatusFilter(record.data, statusFilter)) {
        hiddenByFilter.add(id);
      }
    }
  }

  const isHidden = (id: string) =>
    hiddenByPagination.has(id) || hiddenByFilter.has(id);
  const compactTaskIds = new Set<string>();
  const loadMoreNodes: NodeRecord[] = [];

  // Determine pagination for expanded lists and members
  for (const [id, record] of cache) {
    if (
      (record.data.type !== "list" && record.data.type !== "member") ||
      !expandedIds.has(id)
    ) {
      continue;
    }

    const { visible, loadMore, useCompact } = paginateTaskChildren(
      id,
      cache,
      taskVisibleLimits,
      hiddenByFilter,
    );
    const visibleTaskIds = new Set(visible.map((v) => v.id));

    for (const child of getDirectChildren(id, cache)) {
      if (child.data.type === "task" && !visibleTaskIds.has(child.id)) {
        hiddenByPagination.add(child.id);
      }
    }

    if (useCompact) {
      for (const task of visible) {
        compactTaskIds.add(task.id);
      }
    }

    if (loadMore) loadMoreNodes.push(loadMore);
  }

  function collectTaskDescendants(taskId: string) {
    for (const [childId, childRecord] of cache) {
      if (childRecord.data.parentId === taskId && !isHidden(childId)) {
        visibleIds.add(childId);
        if (expandedIds.has(childId)) {
          collectTaskDescendants(childId);
        }
      }
    }
  }

  function collectVisible(id: string) {
    visibleIds.add(id);
    if (!expandedIds.has(id)) return;

    const record = cache.get(id);

    if (record?.data.type === "list" || record?.data.type === "member") {
      const { visible, loadMore } = paginateTaskChildren(
        id,
        cache,
        taskVisibleLimits,
        hiddenByFilter,
      );

      for (const task of visible) {
        visibleIds.add(task.id);
        if (expandedIds.has(task.id)) {
          collectTaskDescendants(task.id);
        }
      }
      if (loadMore) visibleIds.add(loadMore.id);
      return;
    }

    for (const [childId, childRecord] of cache) {
      if (childRecord.data.parentId === id && !isHidden(childId)) {
        collectVisible(childId);
      }
    }
  }

  for (const [id, record] of cache) {
    if (record.data.parentId === null) {
      collectVisible(id);
    }
  }

  const edges: Edge[] = [];
  const rawNodes: Node<MindMapNodeData>[] = [];

  for (const id of visibleIds) {
    const cached = cache.get(id);
    const loadMore = loadMoreNodes.find((n) => n.id === id);
    const record = cached ?? loadMore;
    if (!record) continue;

    const data: MindMapNodeData = {
      ...record.data,
      isOnPath: pathIds.has(id),
      isSelected: id === selectedId,
      isExpanded: expandedIds.has(id),
      isLoading: loadingIds.has(id),
      compact: compactTaskIds.has(id) || record.data.type === "loadmore",
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
        className:
          pathIds.has(id) && pathIds.has(record.data.parentId)
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
  if (!selectedId || selectedId.startsWith("loadmore:")) return [];
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
