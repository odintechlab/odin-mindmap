import type { TimelineGroupBy, TimelineStats } from "@/types/timeline";

export async function fetchTimelineStats(
  teamId: string,
  options: {
    listId?: string | null;
    assigneeId?: number | null;
    groupBy?: TimelineGroupBy;
  } = {},
): Promise<TimelineStats> {
  const params = new URLSearchParams();
  if (options.listId) params.set("listId", options.listId);
  if (options.assigneeId != null) params.set("assigneeId", String(options.assigneeId));
  if (options.groupBy) params.set("groupBy", options.groupBy);
  const qs = params.toString();
  const res = await fetch(`/api/timeline/${teamId}${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load timeline");
  }
  return res.json();
}
