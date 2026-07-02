import { updateTask, deleteTask } from "@/lib/clickup/tasks";
import { clickupErrorResponse } from "@/lib/clickup/client";
import { isAdminRequest } from "@/lib/admin";
import type { TaskUpdatePayload } from "@/types/clickup";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  if (!isAdminRequest(request)) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { taskId } = await params;
    const body = (await request.json()) as TaskUpdatePayload;

    const payload: TaskUpdatePayload = {};
    if (body.name !== undefined) payload.name = body.name;
    if (body.status !== undefined) payload.status = body.status;
    if (body.priority !== undefined) payload.priority = body.priority;
    if (body.assignees !== undefined) payload.assignees = body.assignees;

    const task = await updateTask(taskId, payload);
    return Response.json({ task });
  } catch (error) {
    return clickupErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  if (!isAdminRequest(request)) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { taskId } = await params;
    await deleteTask(taskId);
    return Response.json({ ok: true });
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
