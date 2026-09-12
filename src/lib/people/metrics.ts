import type { ClickUpTask } from "@/types/clickup";
import {
  getClosedAt,
  isFinishedStatus,
  parseTimestamp,
  taskInAbsoluteRange,
  toTaskSummary,
  type AbsoluteDateRange,
} from "@/lib/dashboard/taskMetrics";
import {
  calendarDayKey,
  formatWeekLabel,
  hourInAppTz,
  isCoreWorkHour,
  startOfDay,
  startOfWeek,
} from "@/lib/datetime";
import type {
  GradeImprovement,
  GradeImprovementId,
  InsightId,
  PeopleHourlyPoint,
  PeoplePriorityMix,
  PeopleProjectMix,
  PeopleRosterMember,
  PeopleStatusCount,
  PeopleStatusGroup,
  PeopleWeeklyPoint,
  PerformanceGrade,
  PerformanceGradeReasonId,
  PerformanceInsight,
} from "@/types/people";

export const STALE_MS = 14 * 86_400_000;
/** No open work + last activity older than this → inactive (not graded). */
export const INACTIVE_AFTER_MS = 21 * 86_400_000;
export const WEEK_MS = 7 * 86_400_000;
export const DAY_MS = 86_400_000;
const MAX_WEEKS = 16;
const ON_TIME_MIN_SAMPLE = 3;
/** Completion-rate bonus needs enough finished work to mean anything. */
const COMPLETION_BONUS_MIN = 3;
/** Rate-based overdue penalties need enough open work to be meaningful. */
const OVERDUE_RATE_MIN_OPEN = 3;
const CYCLE_TIME_MIN_SAMPLE = 3;
const RECENT_COMPLETED_LIMIT = 15;
const PROJECT_MIX_LIMIT = 8;

export {
  APP_TIMEZONE,
  calendarDayKey,
  formatHourRange,
  formatWeekLabel,
  hourInAppTz,
  isCoreWorkHour,
  startOfDay,
  startOfWeek,
} from "@/lib/datetime";

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function isOpenWork(task: ClickUpTask): boolean {
  return !isFinishedStatus(task.status.type);
}

export function isInProgress(task: ClickUpTask): boolean {
  return task.status.type === "custom";
}

export function filterMemberTasks(
  tasks: ClickUpTask[],
  listId: string | null,
  range: AbsoluteDateRange | null,
): ClickUpTask[] {
  let out = tasks;
  if (listId) {
    out = out.filter((t) => t.list?.id === listId);
  }
  if (range) {
    out = out.filter((t) => taskInAbsoluteRange(t, range.fromMs, range.toMs));
  }
  return out;
}

export function weekStartsForRange(
  fromMs: number | null,
  toMs: number | null,
  now: number,
): number[] {
  if (fromMs === null || toMs === null) {
    const starts: number[] = [];
    for (let i = 3; i >= 0; i--) {
      starts.push(startOfWeek(now - i * WEEK_MS));
    }
    return starts;
  }

  const starts: number[] = [];
  let t = startOfWeek(fromMs);
  const last = startOfWeek(toMs);
  while (t <= last && starts.length < MAX_WEEKS) {
    starts.push(t);
    t += WEEK_MS;
  }
  return starts.length > 0 ? starts : [startOfWeek(now)];
}

function inRange(
  ts: number,
  range: { fromMs: number; toMs: number } | null,
): boolean {
  if (!range) return true;
  return ts >= range.fromMs && ts <= range.toMs;
}

export function buildWeeklyCompletedSeries(
  tasks: ClickUpTask[],
  weekStarts: number[],
  range: { fromMs: number; toMs: number } | null,
): PeopleWeeklyPoint[] {
  const counts = new Map(weekStarts.map((w) => [w, 0]));

  for (const task of tasks) {
    if (!isFinishedStatus(task.status.type)) continue;
    const closedAt = getClosedAt(task);
    if (!closedAt) continue;
    if (!inRange(closedAt, range)) continue;
    const week = startOfWeek(closedAt);
    if (counts.has(week)) {
      counts.set(week, (counts.get(week) ?? 0) + 1);
    }
  }

  return weekStarts.map((w) => ({
    weekStartMs: w,
    weekLabel: formatWeekLabel(w),
    count: counts.get(w) ?? 0,
  }));
}

export function buildWeeklyActivitySeries(
  tasks: ClickUpTask[],
  weekStarts: number[],
  range: { fromMs: number; toMs: number } | null,
): PeopleWeeklyPoint[] {
  const daysByWeek = new Map<number, Set<number>>();
  for (const w of weekStarts) daysByWeek.set(w, new Set());

  const add = (ts: number | null) => {
    if (ts === null || ts <= 0) return;
    if (!inRange(ts, range)) return;
    const week = startOfWeek(ts);
    const days = daysByWeek.get(week);
    if (!days) return;
    days.add(startOfDay(ts));
  };

  for (const task of tasks) {
    add(parseTimestamp(task.date_updated));
    if (isFinishedStatus(task.status.type)) {
      add(getClosedAt(task) || null);
    }
  }

  return weekStarts.map((w) => ({
    weekStartMs: w,
    weekLabel: formatWeekLabel(w),
    count: daysByWeek.get(w)?.size ?? 0,
  }));
}

export function buildHourlyActivitySeries(
  tasks: ClickUpTask[],
  range: { fromMs: number; toMs: number } | null,
): PeopleHourlyPoint[] {
  const counts = Array.from({ length: 24 }, () => 0);
  const seen = new Set<string>();

  const add = (taskId: string, ts: number | null) => {
    if (ts === null || ts <= 0) return;
    if (!inRange(ts, range)) return;
    const hour = hourInAppTz(ts);
    const key = `${taskId}:${hour}`;
    if (seen.has(key)) return;
    seen.add(key);
    counts[hour] += 1;
  };

  for (const task of tasks) {
    add(task.id, parseTimestamp(task.date_updated));
    if (isFinishedStatus(task.status.type)) {
      add(task.id, getClosedAt(task) || null);
    }
  }

  return counts.map((count, hour) => ({
    hour,
    count,
    core: isCoreWorkHour(hour),
  }));
}

/** Highest-count hour; ties prefer core hours, then earlier hour. */
export function computePeakActiveHour(
  series: PeopleHourlyPoint[],
): number | null {
  let peak: number | null = null;
  let peakCount = 0;

  for (const point of series) {
    if (point.count <= 0) continue;
    if (
      peak === null ||
      point.count > peakCount ||
      (point.count === peakCount &&
        isCoreWorkHour(point.hour) &&
        !isCoreWorkHour(peak)) ||
      (point.count === peakCount &&
        isCoreWorkHour(point.hour) === isCoreWorkHour(peak) &&
        point.hour < peak)
    ) {
      peak = point.hour;
      peakCount = point.count;
    }
  }

  return peak;
}

export function countDelivery(tasks: ClickUpTask[]): {
  completed: number;
  open: number;
  inProgress: number;
  completionRate: number;
} {
  let completed = 0;
  let open = 0;
  let inProgress = 0;

  for (const task of tasks) {
    if (isFinishedStatus(task.status.type)) {
      completed++;
    } else if (isInProgress(task)) {
      inProgress++;
    } else {
      open++;
    }
  }

  const total = completed + open + inProgress;
  return {
    completed,
    open,
    inProgress,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function computeOnTime(tasks: ClickUpTask[]): {
  rate: number | null;
  onTime: number;
  dated: number;
} {
  let dated = 0;
  let onTime = 0;

  for (const task of tasks) {
    if (!isFinishedStatus(task.status.type)) continue;
    const due = parseTimestamp(task.due_date);
    if (due === null) continue;
    const closedAt = getClosedAt(task);
    if (!closedAt) continue;
    dated++;
    // ClickUp due dates are usually midnight, not a time of day.
    // Finishing anytime on the due calendar day (APP_TIMEZONE) counts as on time.
    if (calendarDayKey(closedAt) <= calendarDayKey(due)) onTime++;
  }

  return {
    dated,
    onTime,
    rate:
      dated >= ON_TIME_MIN_SAMPLE ? Math.round((onTime / dated) * 100) : null,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeCycleTimeMedianDays(tasks: ClickUpTask[]): number | null {
  const days: number[] = [];

  for (const task of tasks) {
    if (!isFinishedStatus(task.status.type)) continue;
    const closedAt = getClosedAt(task);
    if (!closedAt) continue;
    const start =
      parseTimestamp(task.start_date) ?? parseTimestamp(task.date_created);
    if (start === null) continue;
    const elapsed = (closedAt - start) / DAY_MS;
    if (elapsed >= 0) days.push(elapsed);
  }

  if (days.length < CYCLE_TIME_MIN_SAMPLE) return null;
  const med = median(days);
  return med === null ? null : round1(med);
}

export function computeLastActiveAt(tasks: ClickUpTask[]): string | null {
  let max = 0;
  for (const task of tasks) {
    const updated = parseTimestamp(task.date_updated) ?? 0;
    if (updated > max) max = updated;
  }
  return max > 0 ? String(max) : null;
}

export function computeOverdueTasks(
  tasks: ClickUpTask[],
  now: number,
): ClickUpTask[] {
  return tasks.filter((task) => {
    if (!isOpenWork(task)) return false;
    const due = parseTimestamp(task.due_date);
    return due !== null && due < now;
  });
}

export function computeStaleTasks(
  tasks: ClickUpTask[],
  now: number,
): ClickUpTask[] {
  const cutoff = now - STALE_MS;
  return tasks.filter((task) => {
    if (!isOpenWork(task)) return false;
    const updated = parseTimestamp(task.date_updated);
    return updated === null || updated < cutoff;
  });
}

export function computeTouchDays(
  tasks: ClickUpTask[],
  range: { fromMs: number; toMs: number } | null,
  weekStarts: number[],
): number {
  const days = new Set<number>();
  const window = range ?? {
    fromMs: weekStarts[0] ?? 0,
    toMs: (weekStarts[weekStarts.length - 1] ?? 0) + WEEK_MS - 1,
  };

  const add = (ts: number | null) => {
    if (ts === null || ts <= 0) return;
    if (ts < window.fromMs || ts > window.toMs) return;
    days.add(startOfDay(ts));
  };

  for (const task of tasks) {
    add(parseTimestamp(task.date_updated));
    if (isFinishedStatus(task.status.type)) {
      add(getClosedAt(task) || null);
    }
  }

  return days.size;
}

export function computeCollaboration(
  tasks: ClickUpTask[],
  userId: number,
): { collabTasks: number; uniqueCollaborators: number } {
  const collab = tasks.filter((t) => t.assignees.length > 1);
  const ids = new Set<number>();
  for (const task of collab) {
    for (const a of task.assignees) {
      if (a.id !== userId) ids.add(a.id);
    }
  }
  return {
    collabTasks: collab.length,
    uniqueCollaborators: ids.size,
  };
}

export function countOpenCollab(tasks: ClickUpTask[]): number {
  return tasks.filter((t) => isOpenWork(t) && t.assignees.length > 1).length;
}

export function buildStatusCounts(tasks: ClickUpTask[]): PeopleStatusCount[] {
  const map = new Map<string, { label: string; color: string; count: number }>();
  for (const task of tasks) {
    const key = task.status.status;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, {
        label: task.status.status,
        color: task.status.color,
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function buildOpenStatusGroups(tasks: ClickUpTask[]): PeopleStatusGroup[] {
  const map = new Map<
    string,
    { label: string; color: string; tasks: ClickUpTask[] }
  >();

  for (const task of tasks) {
    if (!isOpenWork(task)) continue;
    const key = task.status.status;
    const existing = map.get(key);
    if (existing) {
      existing.tasks.push(task);
    } else {
      map.set(key, {
        label: task.status.status,
        color: task.status.color,
        tasks: [task],
      });
    }
  }

  return [...map.values()]
    .map((group) => ({
      label: group.label,
      color: group.color,
      count: group.tasks.length,
      tasks: group.tasks.map(toTaskSummary),
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildProjectMix(
  tasks: ClickUpTask[],
  limit = PROJECT_MIX_LIMIT,
): PeopleProjectMix[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const task of tasks) {
    const id = task.list?.id;
    if (!id) continue;
    const existing = map.get(id);
    if (existing) {
      existing.count++;
    } else {
      map.set(id, { name: task.list?.name ?? "List", count: 1 });
    }
  }
  return [...map.entries()]
    .map(([id, { name, count }]) => ({ id, name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function buildPriorityMix(tasks: ClickUpTask[]): PeoplePriorityMix[] {
  const map = new Map<string, { label: string; color: string; count: number }>();
  for (const task of tasks) {
    const priority = task.priority;
    if (!priority) continue;
    const key = priority.priority;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, {
        label: priority.priority,
        color: priority.color,
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function recentCompletedTasks(tasks: ClickUpTask[]): ClickUpTask[] {
  return tasks
    .filter((t) => isFinishedStatus(t.status.type) && getClosedAt(t) > 0)
    .sort((a, b) => getClosedAt(b) - getClosedAt(a))
    .slice(0, RECENT_COMPLETED_LIMIT);
}

export function throughputPerWeek(
  completedInRange: number,
  weeklyCompleted: PeopleWeeklyPoint[],
  allTime: boolean,
): number {
  if (allTime) {
    const sum = weeklyCompleted.reduce((s, w) => s + w.count, 0);
    return round1(sum / Math.max(weeklyCompleted.length, 1));
  }
  const weeks = Math.max(weeklyCompleted.length, 1);
  return round1(completedInRange / weeks);
}

export function percentileVsTeammates(
  value: number,
  values: number[],
  higherIsBetter: boolean,
): number | null {
  if (values.length <= 1) return null;
  const others = values.length - 1;
  const better = higherIsBetter
    ? values.filter((v) => v < value).length
    : values.filter((v) => v > value).length;
  return Math.round((better / others) * 100);
}

export function compareNeedsAttention(
  a: Pick<PeopleRosterMember, "overdue" | "stale" | "lastActiveAt">,
  b: Pick<PeopleRosterMember, "overdue" | "stale" | "lastActiveAt">,
): number {
  if (b.overdue !== a.overdue) return b.overdue - a.overdue;
  if (b.stale !== a.stale) return b.stale - a.stale;
  const aLast = a.lastActiveAt ? Number(a.lastActiveAt) : 0;
  const bLast = b.lastActiveAt ? Number(b.lastActiveAt) : 0;
  return aLast - bLast;
}

export interface GradeInput {
  now: number;
  completed: number;
  open: number;
  inProgress: number;
  overdue: number;
  stale: number;
  lastActiveAt: string | null;
  onTimeRate: number | null;
  datedCompletions: number;
  completionRate: number;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Combines delivery, load, and activity signals into one good / average / bad
 * answer. Higher score is better; thresholds are intentionally simple so the
 * badge stays explainable next to the detailed KPIs.
 */
export function computePerformanceGrade(input: GradeInput): PerformanceGrade {
  const openTotal = input.open + input.inProgress;
  const total = input.completed + openTotal;

  if (total === 0) {
    return { level: "insufficient", score: 0, reasonId: "noData" };
  }

  // Dormant / likely quit: cold long enough with no real engagement left.
  // High-volume people who went cold with stale open work still get graded
  // (needs attention) - only low-volume abandoned profiles become Inactive.
  const daysSinceActive = input.lastActiveAt
    ? Math.floor((input.now - Number(input.lastActiveAt)) / DAY_MS)
    : Number.POSITIVE_INFINITY;
  const abandonedOpen =
    openTotal === 0 || (openTotal > 0 && input.stale >= openTotal);
  const longCold = daysSinceActive * DAY_MS >= INACTIVE_AFTER_MS;
  if (
    longCold &&
    abandonedOpen &&
    (openTotal === 0 || input.completed < 5)
  ) {
    return { level: "insufficient", score: 0, reasonId: "inactive" };
  }

  let score = 60;
  const reasons: Array<{ id: PerformanceGradeReasonId; weight: number }> = [];

  const overdueRate =
    openTotal > 0 ? Math.round((input.overdue / openTotal) * 100) : 0;

  if (openTotal > 0) {
    // Tiny open queues: 1/1 = 100% looks "heavy" but is one task, not a backlog.
    if (openTotal < OVERDUE_RATE_MIN_OPEN) {
      if (input.overdue > 0) {
        score -= 10;
        reasons.push({ id: "overdueOpen", weight: 10 });
      } else {
        score += 10;
        reasons.push({ id: "onTrack", weight: 10 });
      }
    } else if (overdueRate >= 50) {
      score -= 35;
      reasons.push({ id: "overdueHeavy", weight: 35 });
    } else if (overdueRate >= 25) {
      score -= 20;
      reasons.push({ id: "overdueHeavy", weight: 20 });
    } else if (overdueRate >= 10) {
      score -= 10;
      reasons.push({ id: "overdueHeavy", weight: 10 });
    } else if (input.overdue === 0) {
      score += 10;
      reasons.push({ id: "onTrack", weight: 10 });
    }
  }

  if (input.stale >= 3) {
    score -= 20;
    reasons.push({ id: "staleWork", weight: 20 });
  } else if (input.stale >= 1) {
    score -= 10;
    reasons.push({ id: "staleWork", weight: 10 });
  } else if (openTotal > 0) {
    score += 5;
  }

  if (input.lastActiveAt) {
    const days = daysSinceActive;
    if (days >= 21) {
      score -= 25;
      reasons.push({ id: "coldActivity", weight: 25 });
    } else if (days >= 14) {
      score -= 15;
      reasons.push({ id: "coldActivity", weight: 15 });
    } else if (days <= 3) {
      score += 10;
      reasons.push({ id: "onTrack", weight: 8 });
    } else if (days <= 7) {
      score += 5;
    }
  } else {
    score -= 15;
    reasons.push({ id: "coldActivity", weight: 15 });
  }

  if (input.onTimeRate !== null && input.datedCompletions >= ON_TIME_MIN_SAMPLE) {
    if (input.onTimeRate >= 85) {
      score += 15;
      reasons.push({ id: "onTrack", weight: 15 });
    } else if (input.onTimeRate >= 70) {
      score += 8;
      reasons.push({ id: "steady", weight: 8 });
    } else if (input.onTimeRate < 50) {
      score -= 20;
      reasons.push({ id: "lateDelivery", weight: 20 });
    } else if (input.onTimeRate < 65) {
      score -= 10;
      reasons.push({ id: "lateDelivery", weight: 10 });
    }
  }

  if (input.completed === 0 && openTotal > 0) {
    score -= 10;
  } else if (input.completed >= COMPLETION_BONUS_MIN && input.completionRate >= 70) {
    score += 8;
    reasons.push({ id: "onTrack", weight: 6 });
  } else if (input.completed >= COMPLETION_BONUS_MIN && input.completionRate >= 40) {
    score += 3;
  }

  const finalScore = clampScore(score);
  const level =
    finalScore >= 70 ? "good" : finalScore >= 40 ? "average" : "bad";

  let reasonId: PerformanceGradeReasonId = "mixed";
  if (reasons.length > 0) {
    const preferred =
      level === "bad"
        ? reasons
            .filter((r) =>
              [
                "overdueHeavy",
                "overdueOpen",
                "staleWork",
                "coldActivity",
                "lateDelivery",
              ].includes(r.id),
            )
            .sort((a, b) => b.weight - a.weight)[0]
        : level === "good"
          ? reasons
              .filter((r) => r.id === "onTrack" || r.id === "steady")
              .sort((a, b) => b.weight - a.weight)[0]
          : reasons.sort((a, b) => b.weight - a.weight)[0];
    reasonId = preferred?.id ?? (level === "good" ? "onTrack" : "mixed");
  } else if (level === "good") {
    reasonId = "onTrack";
  } else if (level === "average") {
    reasonId = "steady";
  }

  return { level, score: finalScore, reasonId };
}

/**
 * Concrete next steps tied to the same signals as the grade, so the badge
 * explains how to improve instead of only naming the problem.
 */
export function buildGradeImprovements(input: GradeInput): GradeImprovement[] {
  if (input.completed + input.open + input.inProgress === 0) return [];

  const tips: GradeImprovement[] = [];
  const daysSinceActive = input.lastActiveAt
    ? Math.floor((input.now - Number(input.lastActiveAt)) / DAY_MS)
    : Number.POSITIVE_INFINITY;

  if (input.overdue > 0) {
    tips.push({
      id: "finishOverdue",
      params: { overdue: input.overdue },
    });
  }

  if (input.stale > 0) {
    tips.push({
      id: "touchStale",
      params: { stale: input.stale },
    });
  }

  if (daysSinceActive >= 7) {
    tips.push({ id: "updateRecently" });
  }

  if (
    input.onTimeRate !== null &&
    input.datedCompletions >= ON_TIME_MIN_SAMPLE &&
    input.onTimeRate < 65
  ) {
    tips.push({ id: "deliverOnTime" });
  }

  return tips.slice(0, 3);
}

export const IMPROVEMENT_MESSAGE_KEYS: Record<
  GradeImprovementId,
  `performance.improve.${GradeImprovementId}`
> = {
  finishOverdue: "performance.improve.finishOverdue",
  touchStale: "performance.improve.touchStale",
  updateRecently: "performance.improve.updateRecently",
  deliverOnTime: "performance.improve.deliverOnTime",
};

export const IMPROVEMENT_SHORT_KEYS: Record<
  GradeImprovementId,
  `performance.improve.short.${GradeImprovementId}`
> = {
  finishOverdue: "performance.improve.short.finishOverdue",
  touchStale: "performance.improve.short.touchStale",
  updateRecently: "performance.improve.short.updateRecently",
  deliverOnTime: "performance.improve.short.deliverOnTime",
};

export interface InsightInput {
  now: number;
  completed: number;
  open: number;
  inProgress: number;
  overdue: number;
  stale: number;
  lastActiveAt: string | null;
  datedCompletions: number;
  onTimeCount: number;
  collabOpen: number;
}

export function generateInsights(input: InsightInput): PerformanceInsight[] {
  const out: PerformanceInsight[] = [];
  const openTotal = input.open + input.inProgress;

  if (openTotal > 0 && input.overdue > 0) {
    out.push({
      id: "overdueOfOpen",
      params: { overdue: input.overdue, openTotal },
    });
  }

  if (input.lastActiveAt) {
    const days = Math.floor(
      (input.now - Number(input.lastActiveAt)) / DAY_MS,
    );
    if (days >= 14) {
      out.push({
        id: days === 1 ? "lastUpdateDayAgo" : "lastUpdateDaysAgo",
        params: { days },
      });
    }
  } else if (openTotal + input.completed > 0) {
    out.push({ id: "noTaskUpdates" });
  }

  if (input.datedCompletions >= ON_TIME_MIN_SAMPLE) {
    out.push({
      id: "finishedOnTime",
      params: {
        onTimeCount: input.onTimeCount,
        datedCompletions: input.datedCompletions,
      },
    });
  }

  if (openTotal > 0 && input.collabOpen > 0) {
    out.push({
      id: "collabOpen",
      params: { collabOpen: input.collabOpen, openTotal },
    });
  }

  if (input.stale > 0 && out.length < 4) {
    out.push({
      id: input.stale === 1 ? "staleOpenOne" : "staleOpen",
      params: { stale: input.stale },
    });
  }

  if (out.length < 2 && input.completed > 0 && input.overdue === 0) {
    out.push({
      id: "completedNoneOverdue",
      params: { completed: input.completed },
    });
  }

  if (out.length === 0 && input.completed === 0 && openTotal === 0) {
    out.push({ id: "noAssignedTasks" });
  }

  return out.slice(0, 4);
}

export const INSIGHT_MESSAGE_KEYS: Record<InsightId, `insight.${InsightId}`> = {
  overdueOfOpen: "insight.overdueOfOpen",
  lastUpdateDaysAgo: "insight.lastUpdateDaysAgo",
  lastUpdateDayAgo: "insight.lastUpdateDayAgo",
  noTaskUpdates: "insight.noTaskUpdates",
  finishedOnTime: "insight.finishedOnTime",
  collabOpen: "insight.collabOpen",
  staleOpen: "insight.staleOpen",
  staleOpenOne: "insight.staleOpenOne",
  completedNoneOverdue: "insight.completedNoneOverdue",
  noAssignedTasks: "insight.noAssignedTasks",
};

export function seriesHasChartData(
  series: { count: number }[],
): boolean {
  if (series.length < 2) return false;
  return series.some((p) => p.count > 0);
}
