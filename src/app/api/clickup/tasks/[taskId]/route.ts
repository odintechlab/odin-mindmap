import { updateTask } from "@/lib/clickup/tasks";
import { clickupErrorResponse } from "@/lib/clickup/client";
import type { TaskUpdatePayload } from "@/types/clickup";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await params;
    const body = (await request.json()) as TaskUpdatePayload;

    const payload: TaskUpdatePayload = {};
    if (body.name !== undefined) payload.name = body.name;
    if (body.status !== undefined) payload.status = body.status;
    if (body.priority !== undefined) payload.priority = body.priority;

    const task = await updateTask(taskId, payload);
    return Response.json({ task });
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
