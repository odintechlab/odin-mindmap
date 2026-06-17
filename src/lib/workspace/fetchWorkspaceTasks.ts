import { getMembers } from "@/lib/clickup/members";
import { getMilestoneTasks, getTasksForAssignee } from "@/lib/clickup/tasks";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import type { ClickUpMember, ClickUpTask } from "@/types/clickup";

const CONCURRENCY = 6;

export interface WorkspaceTasksBundle {
  members: ClickUpMember[];
  memberTasks: ClickUpTask[][];
  allTasks: ClickUpTask[];
}

export async function fetchWorkspaceTasks(
  teamId: string,
): Promise<WorkspaceTasksBundle> {
  const members = await getMembers(teamId);

  const [memberTasks, milestoneTasks] = await Promise.all([
    mapWithConcurrency(members, CONCURRENCY, async (member) =>
      getTasksForAssignee(teamId, String(member.user.id)),
    ),
    getMilestoneTasks(teamId),
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

  return {
    members,
    memberTasks,
    allTasks: [...taskMap.values()],
  };
}
