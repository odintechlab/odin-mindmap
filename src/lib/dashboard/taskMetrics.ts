import type {
  DashboardAssignee,
  DashboardDateRange,
  DashboardProject,
  DashboardTaskSummary,
} from "@/types/dashboard";
import type { ClickUpTask, ClickUpUser } from "@/types/clickup";
import { isFinishedStatus } from "@/lib/clickup/status";
import {
  calendarDayKey,
  endOfIsoDate,
  formatWeekLabel,
  startOfIsoDate,
  startOfWeek,
} from "@/lib/datetime";

export { isFinishedStatus } from "@/lib/clickup/status";

export function parseRangeDays(range: DashboardDateRange): number {
  return Number.parseInt(range, 10);
}

export function parseTimestamp(ts?: string | null): number | null {
  if (!ts) return null;
  const n = Number(ts);
  return Number.isFinite(n) ? n : null;
}

export interface AbsoluteDateRange {
  from: string;
  to: string;
  fromMs: number;
  toMs: number;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateBoundary(
  value: string,
  edge: "start" | "end",
): number | null {
  const trimmed = value.trim();
  if (ISO_DATE_RE.test(trimmed)) {
    return edge === "start" ? startOfIsoDate(trimmed) : endOfIsoDate(trimmed);
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Parse optional from/to. Invalid or incomplete pairs return null (all-time). */
export function parseAbsoluteDateRange(
  from?: string | null,
  to?: string | null,
): AbsoluteDateRange | null {
  if (!from?.trim() || !to?.trim()) return null;
  const fromMs = parseDateBoundary(from, "start");
  const toMs = parseDateBoundary(to, "end");
  if (fromMs === null || toMs === null || fromMs > toMs) return null;

  const toIso = (ms: number) => calendarDayKey(ms);

  return {
    from: ISO_DATE_RE.test(from.trim()) ? from.trim() : toIso(fromMs),
    to: ISO_DATE_RE.test(to.trim()) ? to.trim() : toIso(toMs),
    fromMs,
    toMs,
  };
}

/**
 * Include a task in an absolute dashboard window if it was:
 * - created in range (always checked - even when start/due are empty),
 * - scheduled (start or due) in range when those dates exist,
 * - finished (done/closed) in range, or
 * - still open and created on/before the range end (existed during the period),
 * - or still open and updated in range.
 */
export function taskInAbsoluteRange(
  task: ClickUpTask,
  fromMs: number,
  toMs: number,
): boolean {
  const inWindow = (ms: number | null) =>
    ms !== null && ms >= fromMs && ms <= toMs;

  const created = parseTimestamp(task.date_created);
  if (inWindow(created)) return true;

  if (inWindow(parseTimestamp(task.start_date))) return true;
  if (inWindow(parseTimestamp(task.due_date))) return true;

  if (isFinishedStatus(task.status.type)) {
    const closedAt = getMetricClosedAt(task);
    return closedAt > 0 && closedAt >= fromMs && closedAt <= toMs;
  }

  // Open work: count if it existed by the end of the period (no start/due needed),
  // or was touched during the period.
  if (created !== null && created <= toMs) return true;
  return inWindow(parseTimestamp(task.date_updated));
}

export function getClosedAt(task: ClickUpTask): number {
  const closed = parseTimestamp(task.date_closed);
  const done = parseTimestamp(task.date_done);
  // Prefer the earlier stamp when both exist (rare, but more accurate).
  if (closed !== null && done !== null) return Math.min(closed, done);
  return closed ?? done ?? parseTimestamp(task.date_updated) ?? 0;
}

/**
 * Grace after the due calendar day before a late ClickUp "mark complete"
 * is treated as catch-up (forgot to update), not real delivery timing.
 */
export const CATCH_UP_AFTER_DUE_MS = 7 * 86_400_000;

/**
 * Completion time for delivery metrics (on-time, weekly velocity, cycle time).
 * Catch-up closes — marked complete long after the due day — are attributed
 * to the due day so forgetting to update ClickUp does not look late or
 * inflate the current week. Activity / "recent completed" still use
 * {@link getClosedAt}.
 */
export function getMetricClosedAt(task: ClickUpTask): number {
  const closedAt = getClosedAt(task);
  if (!closedAt) return 0;

  const due = parseTimestamp(task.due_date);
  if (due === null) return closedAt;

  const dueEnd = endOfIsoDate(calendarDayKey(due));
  if (dueEnd === null) return closedAt;

  if (closedAt > dueEnd + CATCH_UP_AFTER_DUE_MS) {
    return dueEnd;
  }
  return closedAt;
}

/** ClickUp Done + Closed - finished work is not open/overdue. */
export function toAssignee(user: ClickUpUser): DashboardAssignee {
  return {
    id: user.id,
    name: user.username,
    profilePicture: user.profilePicture,
  };
}

export function toTaskSummary(task: ClickUpTask): DashboardTaskSummary {
  return {
    id: task.id,
    name: task.name,
    status: {
      label: task.status.status,
      color: task.status.color,
      type: task.status.type,
    },
    updatedAt: task.date_updated ?? task.date_closed ?? "",
    dueDate: task.due_date,
    dateDone: task.date_closed ?? task.date_done ?? null,
    assignees: task.assignees.map(toAssignee),
    listName: task.list?.name,
    url: task.url,
  };
}

export function extractProjects(tasks: ClickUpTask[]): DashboardProject[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const task of tasks) {
    const id = task.list?.id;
    if (!id) continue;
    const existing = map.get(id);
    if (existing) {
      existing.count++;
    } else {
      map.set(id, { name: task.list!.name, count: 1 });
    }
  }
  return [...map.entries()]
    .map(([id, { name, count }]) => ({ id, name, taskCount: count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface TaskBucketCounts {
  open: number;
  inProgress: number;
  closed: number;
  overdue: number;
  total: number;
  completionRate: number;
}

export function countTaskBuckets(
  tasks: ClickUpTask[],
  now = Date.now(),
): TaskBucketCounts {
  let open = 0;
  let inProgress = 0;
  let closed = 0;
  let overdue = 0;

  for (const task of tasks) {
    const type = task.status.type;
    if (isFinishedStatus(type)) {
      closed++;
    } else if (type === "custom") {
      inProgress++;
    } else {
      open++;
    }

    const due = parseTimestamp(task.due_date);
    if (due && !isFinishedStatus(type) && due < now) {
      overdue++;
    }
  }

  const total = tasks.length;
  return {
    open,
    inProgress,
    closed,
    overdue,
    total,
    completionRate: total > 0 ? Math.round((closed / total) * 100) : 0,
  };
}


export function buildWeeklyCompleted(
  tasks: ClickUpTask[],
  now: number,
): { weekStartMs: number; weekLabel: string; count: number }[] {
  const weeks: { start: number; label: string }[] = [];
  for (let i = 3; i >= 0; i--) {
    const start = startOfWeek(now - i * 7 * 86_400_000);
    weeks.push({ start, label: formatWeekLabel(start) });
  }

  const counts = new Map(weeks.map((w) => [w.start, 0]));

  for (const task of tasks) {
    if (!isFinishedStatus(task.status.type)) continue;
    const closedAt = getMetricClosedAt(task);
    if (!closedAt) continue;

    for (const week of weeks) {
      const weekEnd = week.start + 7 * 86_400_000;
      if (closedAt >= week.start && closedAt < weekEnd) {
        counts.set(week.start, (counts.get(week.start) ?? 0) + 1);
        break;
      }
    }
  }

  return weeks.map((w) => ({
    weekStartMs: w.start,
    weekLabel: w.label,
    count: counts.get(w.start) ?? 0,
  }));
}

export function computeVelocityPerWeek(
  weeklyCompleted: { count: number }[],
): number | null {
  const nonZero = weeklyCompleted.map((w) => w.count).filter((c) => c > 0);
  if (nonZero.length === 0) return null;
  return Math.round((nonZero.reduce((a, b) => a + b, 0) / nonZero.length) * 10) / 10;
}
