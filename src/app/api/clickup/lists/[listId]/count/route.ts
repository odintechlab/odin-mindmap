import { countTopLevelTasksInList } from "@/lib/clickup/tasks";
import { clickupErrorResponse } from "@/lib/clickup/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  try {
    const { listId } = await params;
    const count = await countTopLevelTasksInList(listId);
    return Response.json({ count });
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
