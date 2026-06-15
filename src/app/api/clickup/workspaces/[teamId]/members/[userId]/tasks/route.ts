import { getTasksForAssignee } from "@/lib/clickup/tasks";
import { tasksToNodes } from "@/lib/clickup/transform";
import { clickupErrorResponse } from "@/lib/clickup/client";
import { makeNodeId } from "@/types/mindmap";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; userId: string }> },
) {
  try {
    const { teamId, userId } = await params;
    const parentId = makeNodeId("member", userId);
    const tasks = await getTasksForAssignee(teamId, userId);
    const nodes = tasksToNodes(tasks, parentId);
    return Response.json({ nodes });
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
