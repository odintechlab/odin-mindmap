import type { DashboardDateRange } from "@/types/dashboard";
import type { ActivityStats } from "@/types/activity";

export async function fetchActivityStats(
  teamId: string,
  range: DashboardDateRange = "30d",
  listId?: string | null,
): Promise<ActivityStats> {
  const params = new URLSearchParams({ range });
  if (listId) params.set("listId", listId);
  const res = await fetch(`/api/activity/${teamId}?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load activity");
  }
  return res.json();
}
