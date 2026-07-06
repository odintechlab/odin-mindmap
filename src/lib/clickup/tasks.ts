import { clickup } from "./client";
import type {
  ClickUpTask,
  ClickUpTasksResponse,
  TaskCreatePayload,
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

export async function getMilestoneTasks(
  teamId: string,
): Promise<ClickUpTask[]> {
  const tasks: ClickUpTask[] = [];
  let page = 0;

  while (true) {
    const data = await clickup<ClickUpTasksResponse>(
      `/team/${teamId}/task?${TASK_QUERY}&custom_items[]=1&page=${page}`,
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

export async function createTask(listId: string, payload: TaskCreatePayload) {
  return clickup<ClickUpTask>(`/list/${listId}/task`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(taskId: string) {
  await clickup<void>(`/task/${taskId}`, { method: "DELETE" });
}
