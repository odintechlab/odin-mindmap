import { getGoals } from "@/lib/clickup/goals";
import { getMembers } from "@/lib/clickup/members";
import { getMilestoneTasks, getTasksForAssignee } from "@/lib/clickup/tasks";
import { buildTeamWorkload } from "@/lib/dashboard/buildTeamWorkload";
import {
  buildWeeklyCompleted,
  extractProjects,
  getClosedAt,
  isFinishedStatus,
  parseAbsoluteDateRange,
  parseRangeDays,
  parseTimestamp,
  taskInAbsoluteRange,
  toAssignee,
  toTaskSummary,
} from "@/lib/dashboard/taskMetrics";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import type {
  DashboardDateRange,
  DashboardForecast,
  DashboardGoal,
  DashboardMilestone,
  DashboardMilestoneForecast,
  DashboardStats,
} from "@/types/dashboard";
import type { ClickUpTask } from "@/types/clickup";

const CONCURRENCY = 6;
const RECENT_LIMIT = 15;
const VELOCITY_WINDOW_WEEKS = 4;
const MILESTONE_GRACE_MS = 3 * 86_400_000;

// KPI totals + team workload: all-time by default; optional absolute from/to filters them.
// Recent activity: relative ?range= unless from/to is set (then that window).
// Optional ?listId= filters all task-derived sections to one ClickUp list (project).
// Forecast / milestones / goals stay all-time (within list scope) — ambiguous under absolute range.
// Forecast: velocity from last 4 weeks of completions (not completion rate);
// ETA = (open + inProgress) / velocity — task-count based, not story points.
export async function buildDashboardStats(
  teamId: string,
  range: DashboardDateRange = "30d",
  listId: string | null = null,
  from: string | null = null,
  to: string | null = null,
): Promise<DashboardStats> {
  const members = await getMembers(teamId);

  const [memberTasks, milestoneTasks, goals] = await Promise.all([
    mapWithConcurrency(members, CONCURRENCY, async (member) =>
      getTasksForAssignee(teamId, String(member.user.id)),
    ),
    getMilestoneTasks(teamId),
    getGoals(teamId).catch(() => [] as Awaited<ReturnType<typeof getGoals>>),
  ]);

  const taskMap = new Map<string, ClickUpTask>();
  for (const tasks of memberTasks) {
    for (const task of tasks) {
      taskMap.set(task.id, task);
    }
  }
  for (const task of milestoneTasks) {
    taskMap.set(task.id, task);
  }

  const allTasks = [...taskMap.values()];
  const projects = extractProjects(allTasks);
  const listTasks = listId
    ? allTasks.filter((t) => t.list?.id === listId)
    : allTasks;

  const absoluteRange = parseAbsoluteDateRange(from, to);
  const kpiTasks = absoluteRange
    ? listTasks.filter((t) =>
        taskInAbsoluteRange(t, absoluteRange.fromMs, absoluteRange.toMs),
      )
    : listTasks;

  const now = Date.now();
  const rangeMs = parseRangeDays(range) * 86_400_000;
  const relativeStart = now - rangeMs;
  const activityStart = absoluteRange ? absoluteRange.fromMs : relativeStart;
  const activityEnd = absoluteRange ? absoluteRange.toMs : Number.POSITIVE_INFINITY;
  const weekEnd = now + 7 * 86_400_000;

  let open = 0;
  let inProgress = 0;
  let closed = 0;
  let overdue = 0;
  let dueThisWeek = 0;
  let collabTasks = 0;
  const activeAssigneeIds = new Set<number>();

  for (const task of kpiTasks) {
    const type = task.status.type;
    if (type === "closed") {
      closed++;
    } else if (type === "custom") {
      inProgress++;
    } else {
      open++;
    }

    const due = parseTimestamp(task.due_date);
    if (due && !isFinishedStatus(type)) {
      if (due < now) overdue++;
      else if (due <= weekEnd) dueThisWeek++;
    }

    if (type !== "closed" && task.assignees.length > 1) {
      collabTasks++;
    }

    if (type !== "closed") {
      for (const a of task.assignees) {
        activeAssigneeIds.add(a.id);
      }
    }
  }

  const total = kpiTasks.length;
  const completionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

  // Milestones / goals / forecast use list-scoped all-time tasks (not absolute range).
  const milestones = buildMilestones(
    listTasks.filter((t) => t.custom_item_id === 1),
    now,
  );

  const dashboardGoals = listId ? [] : buildGoals(goals);

  const recentUpdated = listTasks
    .filter((t) => {
      const updated = parseTimestamp(t.date_updated);
      return (
        updated !== null && updated >= activityStart && updated <= activityEnd
      );
    })
    .sort(
      (a, b) =>
        (parseTimestamp(b.date_updated) ?? 0) -
        (parseTimestamp(a.date_updated) ?? 0),
    )
    .slice(0, RECENT_LIMIT)
    .map(toTaskSummary);

  const recentCompleted = listTasks
    .filter((t) => t.status.type === "closed")
    .filter((t) => {
      const closedAt =
        parseTimestamp(t.date_closed) ??
        parseTimestamp(t.date_done) ??
        parseTimestamp(t.date_updated);
      return (
        closedAt !== null &&
        closedAt >= activityStart &&
        closedAt <= activityEnd
      );
    })
    .sort((a, b) => getClosedAt(b) - getClosedAt(a))
    .slice(0, RECENT_LIMIT)
    .map(toTaskSummary);

  const weeklyCompleted = buildWeeklyCompleted(listTasks, now);

  const overdueTasks = kpiTasks
    .filter((t) => {
      const due = parseTimestamp(t.due_date);
      return due !== null && !isFinishedStatus(t.status.type) && due < now;
    })
    .sort(
      (a, b) =>
        (parseTimestamp(a.due_date) ?? 0) - (parseTimestamp(b.due_date) ?? 0),
    )
    .map(toTaskSummary);

  const dueThisWeekTasks = kpiTasks
    .filter((t) => {
      const due = parseTimestamp(t.due_date);
      return (
        due !== null &&
        !isFinishedStatus(t.status.type) &&
        due >= now &&
        due <= weekEnd
      );
    })
    .sort(
      (a, b) =>
        (parseTimestamp(a.due_date) ?? 0) - (parseTimestamp(b.due_date) ?? 0),
    )
    .map(toTaskSummary);

  const allTimeOpen = listTasks.filter((t) => t.status.type !== "closed" && t.status.type !== "custom").length;
  const allTimeInProgress = listTasks.filter((t) => t.status.type === "custom").length;
  const forecast = buildForecast(allTimeOpen, allTimeInProgress, weeklyCompleted, now);
  const nextMilestoneForecast = buildMilestoneForecast(milestones, forecast);

  const memberTasksForWorkload = absoluteRange
    ? memberTasks.map((tasks) =>
        tasks.filter((t) =>
          taskInAbsoluteRange(t, absoluteRange.fromMs, absoluteRange.toMs),
        ),
      )
    : memberTasks;
  const teamWorkload = buildTeamWorkload(members, memberTasksForWorkload, listId);

  return {
    generatedAt: new Date().toISOString(),
    range,
    from: absoluteRange?.from ?? null,
    to: absoluteRange?.to ?? null,
    listId,
    projects,
    totals: {
      open,
      inProgress,
      closed,
      overdue,
      dueThisWeek,
      collabTasks,
      activeCollaborators: activeAssigneeIds.size,
      total,
      completionRate,
    },
    milestones,
    goals: dashboardGoals,
    recentActivity: {
      updated: recentUpdated,
      completed: recentCompleted,
    },
    dueTasks: {
      overdue: overdueTasks,
      dueThisWeek: dueThisWeekTasks,
    },
    teamWorkload,
    weeklyCompleted,
    forecast,
    nextMilestoneForecast,
  };
}

function buildForecast(
  open: number,
  inProgress: number,
  weeklyCompleted: { count: number }[],
  now: number,
): DashboardForecast {
  const remaining = open + inProgress;
  const rates = weeklyCompleted.map((w) => w.count);
  const nonZeroRates = rates.filter((c) => c > 0);
  const velocity =
    nonZeroRates.length > 0
      ? nonZeroRates.reduce((a, b) => a + b, 0) / nonZeroRates.length
      : null;

  if (remaining <= 0) {
    return {
      remaining: 0,
      velocityPerWeek: velocity,
      estimatedCompletion: new Date(now).toISOString(),
      confidence: "high",
      weeksRemaining: 0,
      velocityWindowWeeks: VELOCITY_WINDOW_WEEKS,
    };
  }

  if (velocity === null || velocity <= 0) {
    return {
      remaining,
      velocityPerWeek: null,
      estimatedCompletion: null,
      confidence: "none",
      weeksRemaining: null,
      velocityWindowWeeks: VELOCITY_WINDOW_WEEKS,
    };
  }

  const weeksRemaining = remaining / velocity;
  const estimatedCompletion = new Date(
    now + weeksRemaining * 7 * 86_400_000,
  ).toISOString();

  let confidence: DashboardForecast["confidence"] = "high";
  if (nonZeroRates.length < 2) {
    confidence = "low";
  } else {
    const min = Math.min(...nonZeroRates);
    const max = Math.max(...nonZeroRates);
    if (min > 0 && max / min > 3) confidence = "low";
  }

  return {
    remaining,
    velocityPerWeek: Math.round(velocity * 10) / 10,
    estimatedCompletion,
    confidence,
    weeksRemaining: Math.round(weeksRemaining * 10) / 10,
    velocityWindowWeeks: VELOCITY_WINDOW_WEEKS,
  };
}

function buildMilestoneForecast(
  milestones: DashboardMilestone[],
  forecast: DashboardForecast,
): DashboardMilestoneForecast | null {
  const active = milestones.filter((m) => m.group !== "completed");
  const preferred = active.filter(
    (m) =>
      (m.group === "in_progress" || m.group === "upcoming") && m.dueDate,
  );
  const pool =
    preferred.length > 0
      ? preferred
      : active.filter((m) => m.dueDate);

  if (pool.length === 0) return null;

  const next = [...pool].sort(
    (a, b) =>
      (parseTimestamp(a.dueDate) ?? Infinity) -
      (parseTimestamp(b.dueDate) ?? Infinity),
  )[0];

  const dueMs = parseTimestamp(next.dueDate);
  const etaMs = forecast.estimatedCompletion
    ? new Date(forecast.estimatedCompletion).getTime()
    : null;

  let status: DashboardMilestoneForecast["status"];
  if (!dueMs || !etaMs) {
    status = "unknown";
  } else if (etaMs <= dueMs + MILESTONE_GRACE_MS) {
    status = "on_track";
  } else {
    status = "at_risk";
  }

  return {
    milestoneId: next.id,
    milestoneName: next.name,
    dueDate: next.dueDate ?? null,
    status,
  };
}

function buildMilestones(
  milestoneTasks: ClickUpTask[],
  now: number,
): DashboardMilestone[] {
  return milestoneTasks
    .map((task): DashboardMilestone => {
      const isFinished = isFinishedStatus(task.status.type);
      const due = parseTimestamp(task.due_date);
      const isOverdue = !isFinished && due !== null && due < now;

      let group: DashboardMilestone["group"];
      if (isFinished) {
        group = "completed";
      } else if (isOverdue) {
        group = "overdue";
      } else if (task.status.type === "custom") {
        group = "in_progress";
      } else {
        group = "upcoming";
      }

      return {
        id: task.id,
        name: task.name,
        status: {
          label: task.status.status,
          color: task.status.color,
          type: task.status.type,
        },
        dueDate: task.due_date,
        assignees: task.assignees.map(toAssignee),
        listName: task.list?.name,
        url: task.url,
        isOverdue,
        group,
      };
    })
    .sort((a, b) => {
      const order = { overdue: 0, in_progress: 1, upcoming: 2, completed: 3 };
      const diff = order[a.group] - order[b.group];
      if (diff !== 0) return diff;
      return (parseTimestamp(a.dueDate) ?? Infinity) - (parseTimestamp(b.dueDate) ?? Infinity);
    });
}

function buildGoals(
  goals: Awaited<ReturnType<typeof getGoals>>,
): DashboardGoal[] {
  return goals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    percentComplete: goal.percent_completed ?? 0,
    url: goal.pretty_url,
    keyResults: (goal.key_results ?? []).map((kr) => ({
      name: kr.name,
      type: kr.type,
      progress:
        kr.steps_start !== undefined || kr.steps_end !== undefined
          ? {
              current: kr.steps_current,
              target: kr.steps_end,
              unit: kr.unit,
            }
          : kr.percent_completed !== undefined
            ? { current: kr.percent_completed, target: 100 }
            : undefined,
    })),
  }));
}
