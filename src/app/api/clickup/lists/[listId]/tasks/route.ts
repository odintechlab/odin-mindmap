import { getTasksInList } from "@/lib/clickup/tasks";
import { getList } from "@/lib/clickup/lists";
import { tasksToNodes } from "@/lib/clickup/transform";
import { clickupErrorResponse } from "@/lib/clickup/client";
import { makeNodeId } from "@/types/mindmap";

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
