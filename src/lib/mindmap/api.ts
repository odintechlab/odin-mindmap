import { parseNodeId, resolveListClickupId, type NodeRecord } from "@/types/mindmap";

export async function fetchWorkspaces(): Promise<NodeRecord[]> {
  const res = await fetch("/api/clickup/workspaces");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load workspaces");
  }
  const data = await res.json();
  return data.nodes;
}

export async function fetchListTaskCount(listId: string): Promise<number> {
  const res = await fetch(`/api/clickup/lists/${listId}/count`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to count list tasks");
  }
  const data = await res.json();
  return data.count as number;
}

export async function fetchChildren(
  nodeId: string,
  opts?: { workspaceId?: string },
): Promise<NodeRecord[]> {
  const { type, clickupId } = parseNodeId(nodeId);

  let url: string;
  switch (type) {
    case "workspace":
      url = `/api/clickup/workspaces/${clickupId}/spaces`;
      break;
    case "people":
      url = `/api/clickup/workspaces/${clickupId}/members`;
      break;
    case "member":
      if (!opts?.workspaceId) {
        throw new Error("workspaceId required for member tasks");
      }
      url = `/api/clickup/workspaces/${opts.workspaceId}/members/${clickupId}/tasks`;
      break;
    case "space":
      url = `/api/clickup/spaces/${clickupId}/children`;
      break;
    case "folder":
      url = `/api/clickup/folders/${clickupId}/lists`;
      break;
    case "list":
      url = `/api/clickup/lists/${resolveListClickupId(clickupId)}/tasks`;
      break;
    default:
      return [];
  }

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to load children for ${type}`);
  }

  const data = await res.json();
  return data.nodes;
}

export async function updateTask(
  taskId: string,
  payload: {
    name?: string;
    status?: string;
    priority?: number | null;
    assignees?: { add?: number[]; rem?: number[] };
  },
) {
  const res = await fetch(`/api/clickup/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to update task");
  }

  return res.json();
}

export async function createTask(
  listId: string,
  payload: { name: string; parent?: string; assignees?: number[] },
) {
  const res = await fetch(`/api/clickup/lists/${listId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to create task");
  }

  return res.json();
}

export async function deleteTask(taskId: string) {
  const res = await fetch(`/api/clickup/tasks/${taskId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to delete task");
  }

  return res.json();
}
