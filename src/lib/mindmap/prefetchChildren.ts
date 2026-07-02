import {
  parseNodeId,
  isTaskType,
  isMemberScopedListClickupId,
  type NodeRecord,
  type NodeType,
} from "@/types/mindmap";

export const PREFETCHABLE_TYPES = new Set<NodeType>([
  "workspace",
  "space",
  "folder",
  "list",
  "people",
  "member",
]);

export function computeChildCount(
  type: NodeType,
  children: NodeRecord[],
): number {
  if (type === "list") {
    return children.filter((c) => c.data.type === "task").length;
  }
  if (type === "member") {
    return children.filter((c) => c.data.type === "list" || c.data.type === "task").length;
  }
  if (isTaskType(type)) {
    return children.filter((c) => isTaskType(c.data.type)).length;
  }
  return children.length;
}

function shouldOverwriteChild(
  parentType: NodeType,
  parentClickupId: string,
  child: NodeRecord,
  existing: NodeRecord | undefined,
): boolean {
  if (!existing) return true;
  if (parentType === "member") return true;
  if (isMemberScopedListClickupId(parentClickupId)) return true;
  if (child.data.parentId?.includes(":m")) return true;
  return false;
}

/** Merge silently prefetched children into cache without expanding the node. */
export function mergePrefetchedChildren(
  cache: Map<string, NodeRecord>,
  nodeId: string,
  children: NodeRecord[],
): Map<string, NodeRecord> {
  const { type, clickupId } = parseNodeId(nodeId);
  const next = new Map(cache);
  const parent = next.get(nodeId);
  if (!parent) return next;

  const childCount = computeChildCount(type, children);
  next.set(nodeId, {
    ...parent,
    data: {
      ...parent.data,
      childrenLoaded: true,
      childCount,
      hasChildren: childCount > 0 || parent.data.hasChildren === true,
    },
  });

  for (const child of children) {
    const existing = next.get(child.id);
    if (shouldOverwriteChild(type, clickupId, child, existing)) {
      next.set(child.id, child);
    }
  }

  return next;
}

/** Apply a count-only prefetch (large lists) without marking children loaded. */
export function applyPrefetchedCount(
  cache: Map<string, NodeRecord>,
  nodeId: string,
  count: number,
): Map<string, NodeRecord> {
  const next = new Map(cache);
  const parent = next.get(nodeId);
  if (!parent || parent.data.childrenLoaded) return next;

  next.set(nodeId, {
    ...parent,
    data: {
      ...parent.data,
      childCount: count,
      hasChildren: count > 0 || parent.data.hasChildren === true,
    },
  });

  return next;
}

/**
 * Only prefetch direct children of expanded nodes — avoids loading the whole workspace.
 * Roots are eligible when they themselves are expanded.
 */
export function nodesNeedingPrefetch(
  cache: Map<string, NodeRecord>,
  inFlight: Set<string>,
  expandedIds: Set<string>,
): string[] {
  const ids: string[] = [];
  for (const [id, record] of cache) {
    if (inFlight.has(id)) continue;
    if (!PREFETCHABLE_TYPES.has(record.data.type)) continue;
    if (!record.data.hasChildren) continue;
    if (record.data.childrenLoaded) continue;

    const parentId = record.data.parentId;
    const parentExpanded = parentId != null && expandedIds.has(parentId);
    const isExpandedRoot = parentId == null && expandedIds.has(id);

    if (parentExpanded || isExpandedRoot) {
      ids.push(id);
    }
  }
  return ids;
}
