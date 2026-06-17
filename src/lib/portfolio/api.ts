import type { DashboardDateRange } from "@/types/dashboard";
import type { PortfolioStats } from "@/types/portfolio";

export async function fetchPortfolioStats(
  teamId: string,
  range: DashboardDateRange = "30d",
  listId?: string | null,
): Promise<PortfolioStats> {
  const params = new URLSearchParams({ range });
  if (listId) params.set("listId", listId);
  const res = await fetch(`/api/portfolio/${teamId}?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load portfolio");
  }
  return res.json();
}
