import type { DashboardDateRange, DashboardProject, DashboardTaskSummary } from "@/types/dashboard";

export type ActivityEventKind = "updated" | "completed";

export interface ActivityEvent {
  id: string;
  kind: ActivityEventKind;
  task: DashboardTaskSummary;
  at: string;
  dayLabel: string;
}

export interface ActivityStats {
  generatedAt: string;
  range: DashboardDateRange;
  listId: string | null;
  projects: DashboardProject[];
  events: ActivityEvent[];
  phase2: { forms: string };
}
