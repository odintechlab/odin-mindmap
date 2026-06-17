import { parseTimestamp, toTaskSummary } from "@/lib/dashboard/taskMetrics";
import { fetchWorkspaceTasks } from "@/lib/workspace/fetchWorkspaceTasks";
import type { TimelineBar, TimelineGroupBy, TimelineStats } from "@/types/timeline";
import type { ClickUpTask } from "@/types/clickup";

const DAY_MS = 86_400_000;
const DEFAULT_SPAN = 90 * DAY_MS;

function rowLabel(task: ClickUpTask, groupBy: TimelineGroupBy): string {
  if (groupBy === "space") return task.space?.id ? "Space" : "Unknown space";
  if (groupBy === "folder") return task.folder?.name ?? "No folder";
  return task.list?.name ?? "Unknown list";
}

export async function buildTimelineStats(
  teamId: string,
  listId: string | null = null,
  assigneeId: number | null = null,
  groupBy: TimelineGroupBy = "list",
): Promise<TimelineStats> {
  const { allTasks } = await fetchWorkspaceTasks(teamId);
  let tasks = listId
    ? allTasks.filter((t) => t.list?.id === listId)
    : allTasks;

  if (assigneeId != null) {
    tasks = tasks.filter((t) => t.assignees.some((a) => a.id === assigneeId));
  }

  const now = Date.now();
  let rangeStart = now;
  let rangeEnd = now + 14 * DAY_MS;

  const bars: TimelineBar[] = [];

  for (const task of tasks) {
    const start = parseTimestamp(task.start_date) ?? parseTimestamp(task.due_date);
    const end = parseTimestamp(task.due_date) ?? parseTimestamp(task.start_date);
    if (start === null && end === null) continue;

    const startMs = start ?? end!;
    const endMs = Math.max(end ?? startMs, startMs + DAY_MS);

    rangeStart = Math.min(rangeStart, startMs - 7 * DAY_MS);
    rangeEnd = Math.max(rangeEnd, endMs + 7 * DAY_MS);

    bars.push({
      task: toTaskSummary(task),
      startMs,
      endMs,
      rowLabel: rowLabel(task, groupBy),
    });
  }

  if (bars.length === 0) {
    rangeStart = now - DEFAULT_SPAN / 2;
    rangeEnd = now + DEFAULT_SPAN / 2;
  }

  bars.sort((a, b) => a.rowLabel.localeCompare(b.rowLabel) || a.startMs - b.startMs);

  const projectMap = new Map<string, string>();
  const assigneeMap = new Map<number, string>();
  for (const task of allTasks) {
    if (task.list?.id) {
      projectMap.set(task.list.id, task.list.name);
    }
    for (const a of task.assignees) {
      assigneeMap.set(a.id, a.username);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    listId,
    assigneeId,
    groupBy,
    rangeStart,
    rangeEnd,
    bars,
    projects: [...projectMap.entries()].map(([id, name]) => ({ id, name })),
    assignees: [...assigneeMap.entries()].map(([id, name]) => ({ id, name })),
  };
}
