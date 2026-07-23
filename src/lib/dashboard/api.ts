import type { DashboardDateRange, DashboardStats } from "@/types/dashboard";

export async function fetchDashboardStats(
  teamId: string,
  range: DashboardDateRange = "30d",
  listId?: string | null,
  from?: string | null,
  to?: string | null,
): Promise<DashboardStats> {
  const params = new URLSearchParams({ range });
  if (listId) params.set("listId", listId);
  if (from && to) {
    params.set("from", from);
    params.set("to", to);
  }
  const res = await fetch(`/api/dashboard/${teamId}?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load dashboard stats");
  }
  return res.json();
}

export function formatDate(isoOrMs: string): string {
  const ms = Number(isoOrMs);
  const d = Number.isFinite(ms) && ms > 1e10 ? new Date(ms) : new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(isoOrMs: string): string {
  const ms = Number(isoOrMs);
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}
