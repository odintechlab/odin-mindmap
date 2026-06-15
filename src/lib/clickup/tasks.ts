import { clickup } from "./client";
import type {
  ClickUpTask,
  ClickUpTasksResponse,
  TaskUpdatePayload,
} from "@/types/clickup";

const TASK_QUERY =
  "subtasks=true&include_closed=true&include_markdown_description=false";

export async function getTasksInList(listId: string): Promise<ClickUpTask[]> {
  const tasks: ClickUpTask[] = [];
  let page = 0;

  while (true) {
    const data = await clickup<ClickUpTasksResponse>(
      `/list/${listId}/task?${TASK_QUERY}&page=${page}`,
    );
    tasks.push(...data.tasks);
    if (data.last_page) break;
    page++;
  }

  return tasks;
}

export async function getTasksForAssignee(
  teamId: string,
  userId: string,
): Promise<ClickUpTask[]> {
  const tasks: ClickUpTask[] = [];
  let page = 0;

  while (true) {
    const data = await clickup<ClickUpTasksResponse>(
      `/team/${teamId}/task?${TASK_QUERY}&assignees[]=${userId}&page=${page}`,
    );
    tasks.push(...data.tasks);
    if (data.last_page) break;
    page++;
  }

  return tasks;
}

export async function updateTask(taskId: string, payload: TaskUpdatePayload) {
  return clickup<ClickUpTask>(`/task/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
