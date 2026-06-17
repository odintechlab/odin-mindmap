import type {
  DashboardAssignee,
  DashboardDateRange,
  DashboardProject,
  DashboardTaskSummary,
} from "@/types/dashboard";
import type { ClickUpTask, ClickUpUser } from "@/types/clickup";

export function parseRangeDays(range: DashboardDateRange): number {
  return Number.parseInt(range, 10);
}

export function parseTimestamp(ts?: string | null): number | null {
  if (!ts) return null;
  const n = Number(ts);
  return Number.isFinite(n) ? n : null;
}

export function getClosedAt(task: ClickUpTask): number {
  return (
    parseTimestamp(task.date_closed) ??
    parseTimestamp(task.date_done) ??
    parseTimestamp(task.date_updated) ??
    0
  );
}

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
    if (type === "closed") {
      closed++;
    } else if (type === "custom") {
      inProgress++;
    } else {
      open++;
    }

    const due = parseTimestamp(task.due_date);
    if (due && type !== "closed" && due < now) {
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

function startOfWeek(ts: number): number {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d.getTime();
}

function formatWeekLabel(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function buildWeeklyCompleted(
  tasks: ClickUpTask[],
  now: number,
): { weekLabel: string; count: number }[] {
  const weeks: { start: number; label: string }[] = [];
  for (let i = 3; i >= 0; i--) {
    const start = startOfWeek(now - i * 7 * 86_400_000);
    weeks.push({ start, label: formatWeekLabel(start) });
  }

  const counts = new Map(weeks.map((w) => [w.start, 0]));

  for (const task of tasks) {
    if (task.status.type !== "closed") continue;
    const closedAt = getClosedAt(task);
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
