import type { TaskStatusFilter } from "./constants";
import { isTaskType, type MindMapNodeData } from "@/types/mindmap";

export function matchesStatusFilter(
  data: MindMapNodeData,
  filter: TaskStatusFilter,
): boolean {
  if (filter === "all" || !isTaskType(data.type)) return true;
  return data.status?.type === filter;
}
