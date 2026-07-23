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
/** Treat date_updated near closedAt as the completion itself, not a separate edit. */
const COMPLETION_UPDATE_WINDOW_MS = 60_000;

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
    const isClosed = task.status.type === "closed";
    const closedAt = isClosed ? getClosedAt(task) : null;
    const hasCompletedInRange =
      closedAt !== null && closedAt >= rangeStart;

    if (hasCompletedInRange) {
      events.push({
        id: `${task.id}-completed`,
        kind: "completed",
        task: toTaskSummary(task),
        at: String(closedAt),
        dayLabel: dayLabel(closedAt),
      });
    }

    // Skip Updated when it is the same completion bump; keep it for a
    // clear post-completion edit (updated meaningfully after closedAt).
    const isPostCompletionEdit =
      hasCompletedInRange &&
      updated !== null &&
      updated > closedAt + COMPLETION_UPDATE_WINDOW_MS;

    if (
      updated !== null &&
      updated >= rangeStart &&
      (!hasCompletedInRange || isPostCompletionEdit)
    ) {
      events.push({
        id: `${task.id}-updated`,
        kind: "updated",
        task: toTaskSummary(task),
        at: task.date_updated ?? "",
        dayLabel: dayLabel(updated),
      });
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
