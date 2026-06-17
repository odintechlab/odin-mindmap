import { clickupErrorResponse } from "@/lib/clickup/client";
import { buildTimelineStats } from "@/lib/timeline/buildTimeline";
import type { TimelineGroupBy } from "@/types/timeline";

const VALID_GROUP: Set<TimelineGroupBy> = new Set(["list", "folder", "space"]);

function parseGroupBy(value: string | null): TimelineGroupBy {
  if (value && VALID_GROUP.has(value as TimelineGroupBy)) {
    return value as TimelineGroupBy;
  }
  return "list";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get("listId") || null;
    const assigneeRaw = searchParams.get("assigneeId");
    const assigneeId = assigneeRaw ? Number(assigneeRaw) : null;
    const groupBy = parseGroupBy(searchParams.get("groupBy"));
    const stats = await buildTimelineStats(
      teamId,
      listId,
      Number.isFinite(assigneeId) ? assigneeId : null,
      groupBy,
    );
    return Response.json(stats);
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
