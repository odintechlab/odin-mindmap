import { toTaskSummary } from "@/lib/dashboard/taskMetrics";
import type { AbsoluteDateRange } from "@/lib/dashboard/taskMetrics";
import {
  buildOpenStatusGroups,
  buildPriorityMix,
  buildProjectMix,
  buildStatusCounts,
  buildHourlyActivitySeries,
  buildWeeklyActivitySeries,
  buildWeeklyCompletedSeries,
  computeCollaboration,
  computeCycleTimeMedianDays,
  computeLastActiveAt,
  computeOnTime,
  computeOverdueTasks,
  computePeakActiveHour,
  computePerformanceGrade,
  computeStaleTasks,
  computeTouchDays,
  countDelivery,
  countOpenCollab,
  buildGradeImprovements,
  generateInsights,
  isOpenWork,
  percentileVsTeammates,
  recentCompletedTasks,
  throughputPerWeek,
} from "@/lib/people/metrics";
import type { ClickUpMember, ClickUpTask } from "@/types/clickup";
import type { PeopleRosterMember } from "@/types/people";
import { memberDisplayName } from "./context";

export function summarizeRosterMember(
  member: ClickUpMember,
  tasks: ClickUpTask[],
  weekStarts: number[],
  range: AbsoluteDateRange | null,
  now: number,
): PeopleRosterMember {
  const delivery = countDelivery(tasks);
  const overdue = computeOverdueTasks(tasks, now);
  const stale = computeStaleTasks(tasks, now);
  const lastActiveAt = computeLastActiveAt(tasks);
  const onTime = computeOnTime(tasks);

  return {
    id: member.user.id,
    name: memberDisplayName(member),
    profilePicture: member.user.profilePicture,
    completed: delivery.completed,
    open: delivery.open,
    inProgress: delivery.inProgress,
    overdue: overdue.length,
    stale: stale.length,
    completionPct: delivery.completionRate,
    lastActiveAt,
    grade: computePerformanceGrade({
      now,
      completed: delivery.completed,
      open: delivery.open,
      inProgress: delivery.inProgress,
      overdue: overdue.length,
      stale: stale.length,
      lastActiveAt,
      onTimeRate: onTime.rate,
      datedCompletions: onTime.dated,
      completionRate: delivery.completionRate,
    }),
    weeklyCompleted: buildWeeklyCompletedSeries(tasks, weekStarts, range),
    byStatus: buildStatusCounts(tasks.filter(isOpenWork)),
  };
}

export function buildDetailPayload(
  member: ClickUpMember,
  tasks: ClickUpTask[],
  roster: PeopleRosterMember[],
  weekStarts: number[],
  range: AbsoluteDateRange | null,
  now: number,
) {
  const delivery = countDelivery(tasks);
  const overdueTasks = computeOverdueTasks(tasks, now);
  const staleTasks = computeStaleTasks(tasks, now);
  const onTime = computeOnTime(tasks);
  const weeklyCompleted = buildWeeklyCompletedSeries(tasks, weekStarts, range);
  const weeklyActivity = buildWeeklyActivitySeries(tasks, weekStarts, range);
  const hourlyActivity = buildHourlyActivitySeries(tasks, range);
  const peakActiveHour = computePeakActiveHour(hourlyActivity);
  const collab = computeCollaboration(tasks, member.user.id);
  const openTotal = delivery.open + delivery.inProgress;
  const index = roster.findIndex((m) => m.id === member.user.id);
  const lastActiveAt = computeLastActiveAt(tasks);

  const completedValues = roster.map((m) => m.completed);
  const overdueValues = roster.map((m) => m.overdue);

  const percentiles =
    roster.length > 1
      ? {
          completed: percentileVsTeammates(
            delivery.completed,
            completedValues,
            true,
          ),
          overdue: percentileVsTeammates(
            overdueTasks.length,
            overdueValues,
            false,
          ),
          sampleSize: roster.length,
        }
      : null;

  return {
    member: {
      id: member.user.id,
      name: memberDisplayName(member),
      profilePicture: member.user.profilePicture,
    },
    neighbors: {
      prevId: index > 0 ? roster[index - 1].id : null,
      nextId:
        index >= 0 && index < roster.length - 1 ? roster[index + 1].id : null,
    },
    kpis: {
      completed: delivery.completed,
      open: delivery.open,
      inProgress: delivery.inProgress,
      completionRate: delivery.completionRate,
      throughputPerWeek: throughputPerWeek(
        delivery.completed,
        weeklyCompleted,
        range === null,
      ),
      onTimeRate: onTime.rate,
      onTimeCount: onTime.onTime,
      datedCompletions: onTime.dated,
      overdue: overdueTasks.length,
      overdueRate:
        openTotal > 0 ? Math.round((overdueTasks.length / openTotal) * 100) : 0,
      stale: staleTasks.length,
      cycleTimeMedianDays: computeCycleTimeMedianDays(tasks),
      lastActiveAt,
      touchDays: computeTouchDays(tasks, range, weekStarts),
      peakActiveHour,
      collabTasks: collab.collabTasks,
      uniqueCollaborators: collab.uniqueCollaborators,
    },
    percentiles,
    // Grade uses the same absolute signals as the roster card - not teammate
    // percentiles - so list and detail never disagree for the same person.
    grade: computePerformanceGrade({
      now,
      completed: delivery.completed,
      open: delivery.open,
      inProgress: delivery.inProgress,
      overdue: overdueTasks.length,
      stale: staleTasks.length,
      lastActiveAt,
      onTimeRate: onTime.rate,
      datedCompletions: onTime.dated,
      completionRate: delivery.completionRate,
    }),
    improvements: buildGradeImprovements({
      now,
      completed: delivery.completed,
      open: delivery.open,
      inProgress: delivery.inProgress,
      overdue: overdueTasks.length,
      stale: staleTasks.length,
      lastActiveAt,
      onTimeRate: onTime.rate,
      datedCompletions: onTime.dated,
      completionRate: delivery.completionRate,
    }),
    insights: generateInsights({
      now,
      completed: delivery.completed,
      open: delivery.open,
      inProgress: delivery.inProgress,
      overdue: overdueTasks.length,
      stale: staleTasks.length,
      lastActiveAt,
      datedCompletions: onTime.dated,
      onTimeCount: onTime.onTime,
      collabOpen: countOpenCollab(tasks),
    }),
    weeklyCompleted,
    weeklyActivity,
    hourlyActivity,
    byStatus: buildStatusCounts(tasks),
    byProject: buildProjectMix(tasks),
    byPriority: buildPriorityMix(tasks),
    overdueTasks: overdueTasks.map(toTaskSummary),
    staleTasks: staleTasks.map(toTaskSummary),
    completedTasks: recentCompletedTasks(tasks).map(toTaskSummary),
    openByStatus: buildOpenStatusGroups(tasks),
  };
}
