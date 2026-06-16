export type NodeType =
  | "workspace"
  | "space"
  | "folder"
  | "list"
  | "task"
  | "subtask"
  | "loadmore"
  | "people"
  | "member";

export interface MindMapAssignee {
  username: string;
  profilePicture?: string | null;
}

export interface MindMapNodeData {
  type: NodeType;
  clickupId: string;
  parentId: string | null;
  label: string;
  status?: { name: string; color: string; type?: string };
  priority?: { id: string; label: string; color: string };
  dueDate?: string | null;
  assignees?: MindMapAssignee[];
  url?: string;
  childCount?: number;
  childrenLoaded?: boolean;
  listId?: string;
  statuses?: { name: string; color: string }[];
  isOnPath?: boolean;
  isSelected?: boolean;
  isExpanded?: boolean;
  isLoading?: boolean;
  hasChildren?: boolean;
  /** For loadmore nodes — the list node id to paginate */
  listParentId?: string;
  /** Remaining task count shown on load-more node */
  remainingCount?: number;
  /** Render in compact mode (dense lists) */
  compact?: boolean;
  /** Workspace id — for member nodes fetching assignee tasks */
  workspaceId?: string;
  [key: string]: unknown;
}

export interface NodeRecord {
  id: string;
  data: MindMapNodeData;
}

export interface TaskUpdateRequest {
  name?: string;
  status?: string;
  priority?: number | null;
}

export function makeNodeId(type: NodeType, clickupId: string): string {
  return `${type}:${clickupId}`;
}

export function parseNodeId(id: string): { type: NodeType; clickupId: string } {
  if (id.startsWith("loadmore:")) {
    return { type: "loadmore", clickupId: id.slice("loadmore:".length) };
  }
  const [type, ...rest] = id.split(":");
  return { type: type as NodeType, clickupId: rest.join(":") };
}

export function makeLoadMoreId(listNodeId: string): string {
  return `loadmore:${listNodeId}`;
}

export function isTaskType(type: NodeType): boolean {
  return type === "task" || type === "subtask";
}
