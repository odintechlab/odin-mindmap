import {
  buildWeeklyCompleted,
  computeVelocityPerWeek,
  countTaskBuckets,
  isFinishedStatus,
  parseTimestamp,
  toTaskSummary,
} from "@/lib/dashboard/taskMetrics";
import { fetchWorkspaceTasks } from "@/lib/workspace/fetchWorkspaceTasks";
import type { DashboardDateRange, DashboardTaskSummary } from "@/types/dashboard";
import type {
  PortfolioPersonOverdue,
  PortfolioProject,
  PortfolioStats,
} from "@/types/portfolio";
import type { ClickUpTask } from "@/types/clickup";

const STALE_MS = 14 * 86_400_000;

export async function buildPortfolioStats(
  teamId: string,
  range: DashboardDateRange = "30d",
  listId: string | null = null,
): Promise<PortfolioStats> {
  const { allTasks } = await fetchWorkspaceTasks(teamId);
  const tasks = listId
    ? allTasks.filter((t) => t.list?.id === listId)
    : allTasks;
  const now = Date.now();

  const byList = new Map<string, ClickUpTask[]>();
  for (const task of tasks) {
    const id = task.list?.id;
    if (!id) continue;
    const bucket = byList.get(id) ?? [];
    bucket.push(task);
    byList.set(id, bucket);
  }

  const projects: PortfolioProject[] = [...byList.entries()]
    .map(([id, listTasks]) => {
      const counts = countTaskBuckets(listTasks, now);
      const weekly = buildWeeklyCompleted(listTasks, now);
      const name = listTasks[0]?.list?.name ?? "Unknown";
      return {
        id,
        name,
        ...counts,
        velocityPerWeek: computeVelocityPerWeek(weekly),
      };
    })
    .sort((a, b) => b.overdue - a.overdue || a.completionRate - b.completionRate);

  const overdueByPerson = new Map<number, PortfolioPersonOverdue>();
  for (const task of tasks) {
    const due = parseTimestamp(task.due_date);
    if (!due || isFinishedStatus(task.status.type) || due >= now) continue;
    for (const a of task.assignees) {
      const existing = overdueByPerson.get(a.id);
      if (existing) {
        existing.overdueCount++;
      } else {
        overdueByPerson.set(a.id, {
          id: a.id,
          name: a.username,
          profilePicture: a.profilePicture,
          overdueCount: 1,
        });
      }
    }
  }

  const topOverduePeople = [...overdueByPerson.values()]
    .sort((a, b) => b.overdueCount - a.overdueCount)
    .slice(0, 8);

  const staleTasks = tasks
    .filter((t) => {
      if (t.status.type === "closed") return false;
      const updated = parseTimestamp(t.date_updated);
      return updated !== null && now - updated >= STALE_MS;
    })
    .sort(
      (a, b) =>
        (parseTimestamp(a.date_updated) ?? 0) -
        (parseTimestamp(b.date_updated) ?? 0),
    )
    .slice(0, 12)
    .map(toTaskSummary);

  const atRiskMilestones = tasks
    .filter((t) => t.custom_item_id === 1)
    .filter((t) => {
      if (t.status.type === "closed") return false;
      const due = parseTimestamp(t.due_date);
      return due !== null && due < now + 7 * 86_400_000;
    })
    .slice(0, 8)
    .map(toTaskSummary);

  return {
    generatedAt: new Date().toISOString(),
    range,
    listId,
    projects,
    topOverduePeople,
    staleTasks,
    atRiskMilestones,
    phase2: {
      customFields: "Coming soon — custom field rollups per project",
      forms: "Coming soon — form submission pipeline",
      attachments: "Coming soon — proofing & attachment previews",
    },
  };
}
