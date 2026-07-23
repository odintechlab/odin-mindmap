import type { ClickUpMember, ClickUpTask } from "@/types/clickup";
import type { DashboardMemberWorkload } from "@/types/dashboard";
import { isFinishedStatus, toTaskSummary } from "./taskMetrics";

export function buildTeamWorkload(
  members: ClickUpMember[],
  memberTasks: ClickUpTask[][],
  listId: string | null,
): DashboardMemberWorkload[] {
  return members
    .map((member, index) => {
      let tasks = memberTasks[index] ?? [];
      if (listId) {
        tasks = tasks.filter((t) => t.list?.id === listId);
      }

      let done = 0;
      let notDone = 0;
      const doneTaskList: ClickUpTask[] = [];
      const statusMap = new Map<
        string,
        { label: string; color: string; tasks: ClickUpTask[] }
      >();

      for (const task of tasks) {
        if (isFinishedStatus(task.status.type)) {
          done++;
          doneTaskList.push(task);
        } else {
          notDone++;
          const key = task.status.status;
          const existing = statusMap.get(key);
          if (existing) {
            existing.tasks.push(task);
          } else {
            statusMap.set(key, {
              label: task.status.status,
              color: task.status.color,
              tasks: [task],
            });
          }
        }
      }

      const total = done + notDone;
      const byStatus = [...statusMap.values()]
        .map((group) => ({
          label: group.label,
          color: group.color,
          count: group.tasks.length,
          tasks: group.tasks.map(toTaskSummary),
        }))
        .sort((a, b) => b.count - a.count);

      return {
        id: member.user.id,
        name:
          member.user.username ||
          member.user.email ||
          `User ${member.user.id}`,
        profilePicture: member.user.profilePicture,
        done,
        notDone,
        completionPct: total > 0 ? Math.round((done / total) * 100) : 0,
        byStatus,
        doneTasks: doneTaskList.map(toTaskSummary),
      };
    })
    .filter((m) => m.done + m.notDone > 0)
    .sort((a, b) => b.notDone - a.notDone || b.done - a.done);
}
