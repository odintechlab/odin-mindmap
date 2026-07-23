import { clickupErrorResponse } from "@/lib/clickup/client";
import { buildDashboardStats } from "@/lib/dashboard/buildStats";
import type { DashboardDateRange } from "@/types/dashboard";

const VALID_RANGES = new Set<DashboardDateRange>(["7d", "30d", "90d"]);

function parseRange(value: string | null): DashboardDateRange {
  if (value && VALID_RANGES.has(value as DashboardDateRange)) {
    return value as DashboardDateRange;
  }
  return "30d";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    const { searchParams } = new URL(request.url);
    const range = parseRange(searchParams.get("range"));
    const listId = searchParams.get("listId") || null;
    const from = searchParams.get("from") || null;
    const to = searchParams.get("to") || null;
    const stats = await buildDashboardStats(teamId, range, listId, from, to);
    return Response.json(stats);
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
