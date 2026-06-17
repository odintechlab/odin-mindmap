import { clickupErrorResponse } from "@/lib/clickup/client";
import { parseRangeParam } from "@/lib/api/parseRange";
import { buildActivityStats } from "@/lib/activity/buildActivity";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    const { searchParams } = new URL(request.url);
    const range = parseRangeParam(searchParams.get("range"));
    const listId = searchParams.get("listId") || null;
    const stats = await buildActivityStats(teamId, range, listId);
    return Response.json(stats);
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
