import type { DashboardTaskSummary } from "@/types/dashboard";

export type TimelineGroupBy = "list" | "folder" | "space";

export interface TimelineBar {
  task: DashboardTaskSummary;
  startMs: number;
  endMs: number;
  rowLabel: string;
}

export interface TimelineStats {
  generatedAt: string;
  listId: string | null;
  assigneeId: number | null;
  groupBy: TimelineGroupBy;
  rangeStart: number;
  rangeEnd: number;
  bars: TimelineBar[];
  projects: { id: string; name: string }[];
  assignees: { id: number; name: string }[];
}
