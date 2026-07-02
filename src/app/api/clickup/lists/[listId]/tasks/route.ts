import { getTasksInList, createTask } from "@/lib/clickup/tasks";
import { getList } from "@/lib/clickup/lists";
import { tasksToNodes, taskToNode } from "@/lib/clickup/transform";
import { clickupErrorResponse } from "@/lib/clickup/client";
import { isAdminRequest } from "@/lib/admin";
import { makeNodeId } from "@/types/mindmap";
import type { TaskCreatePayload } from "@/types/clickup";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  try {
    const { listId } = await params;
    const parentId = makeNodeId("list", listId);

    const [tasks, list] = await Promise.all([
      getTasksInList(listId),
      getList(listId).catch(() => null),
    ]);

    const statuses = list?.statuses?.map((s) => ({
      name: s.status,
      color: s.color,
    }));

    const nodes = tasksToNodes(tasks, parentId, statuses);
    return Response.json({ nodes, statuses });
  } catch (error) {
    return clickupErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  if (!isAdminRequest(request)) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { listId } = await params;
    const body = (await request.json()) as TaskCreatePayload;

    if (!body.name?.trim()) {
      return Response.json({ error: "Task name is required" }, { status: 400 });
    }

    const [task, list] = await Promise.all([
      createTask(listId, {
        name: body.name.trim(),
        parent: body.parent,
        assignees: body.assignees,
      }),
      getList(listId).catch(() => null),
    ]);

    const statuses = list?.statuses?.map((s) => ({
      name: s.status,
      color: s.color,
    }));

    const parentId = body.parent
      ? makeNodeId("task", body.parent)
      : makeNodeId("list", listId);

    const node = taskToNode(task, parentId, statuses);
    return Response.json({ task, node });
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
