import {
  getClosedAt,
  extractProjects,
  parseRangeDays,
  parseTimestamp,
  toTaskSummary,
} from "@/lib/dashboard/taskMetrics";
import { fetchWorkspaceTasks } from "@/lib/workspace/fetchWorkspaceTasks";
import type { DashboardDateRange } from "@/types/dashboard";
import type { ActivityEvent, ActivityStats } from "@/types/activity";

const PAGE_LIMIT = 80;

function dayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export async function buildActivityStats(
  teamId: string,
  range: DashboardDateRange = "30d",
  listId: string | null = null,
): Promise<ActivityStats> {
  const { allTasks } = await fetchWorkspaceTasks(teamId);
  const tasks = listId
    ? allTasks.filter((t) => t.list?.id === listId)
    : allTasks;
  const now = Date.now();
  const rangeStart = now - parseRangeDays(range) * 86_400_000;

  const events: ActivityEvent[] = [];

  for (const task of tasks) {
    const updated = parseTimestamp(task.date_updated);
    if (updated !== null && updated >= rangeStart) {
      events.push({
        id: `${task.id}-updated`,
        kind: "updated",
        task: toTaskSummary(task),
        at: task.date_updated ?? "",
        dayLabel: dayLabel(updated),
      });
    }

    if (task.status.type === "closed") {
      const closedAt = getClosedAt(task);
      if (closedAt >= rangeStart) {
        events.push({
          id: `${task.id}-completed`,
          kind: "completed",
          task: toTaskSummary(task),
          at: String(closedAt),
          dayLabel: dayLabel(closedAt),
        });
      }
    }
  }

  events.sort((a, b) => Number(b.at) - Number(a.at));

  return {
    generatedAt: new Date().toISOString(),
    range,
    listId,
    projects: extractProjects(allTasks),
    events: events.slice(0, PAGE_LIMIT),
    phase2: { forms: "Coming soon — form submissions in activity feed" },
  };
}
