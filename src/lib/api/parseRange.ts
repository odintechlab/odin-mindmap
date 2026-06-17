import type { DashboardDateRange } from "@/types/dashboard";

const VALID_RANGES = new Set<DashboardDateRange>(["7d", "30d", "90d"]);

export function parseRangeParam(value: string | null): DashboardDateRange {
  if (value && VALID_RANGES.has(value as DashboardDateRange)) {
    return value as DashboardDateRange;
  }
  return "30d";
}
