export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 72;
export const NODE_HEIGHT_COMPACT = 52;
export const NODE_WIDTH_COMPACT = 200;

/** How many top-level tasks to show per list before "Show more" */
export const TASK_PAGE_SIZE = 25;

/** Use grid layout when a list has at least this many visible tasks */
export const TASK_GRID_THRESHOLD = 8;

/** Columns in the task grid */
export const TASK_GRID_COLS = 4;

export const PRIORITY_OPTIONS = [
  { value: 1, label: "Urgent", color: "#f50000" },
  { value: 2, label: "High", color: "#ffcc00" },
  { value: 3, label: "Normal", color: "#6fddff" },
  { value: 4, label: "Low", color: "#d8d8d8" },
] as const;

export const TYPE_COLORS: Record<string, string> = {
  workspace: "#6366f1",
  space: "#8b5cf6",
  folder: "#a78bfa",
  list: "#c4b5fd",
  task: "#3b82f6",
  subtask: "#60a5fa",
  loadmore: "#6366f1",
  people: "#0d9488",
  member: "#14b8a6",
};

/** ClickUp status.type values used for task filtering */
export type TaskStatusFilter = "all" | "open" | "custom" | "closed";

export const STATUS_FILTER_OPTIONS: {
  value: TaskStatusFilter;
  label: string;
  color: string;
}[] = [
  { value: "all", label: "All", color: "#a1a1aa" },
  { value: "open", label: "To Do", color: "#94a3b8" },
  { value: "custom", label: "In Progress", color: "#3b82f6" },
  { value: "closed", label: "Completed", color: "#22c55e" },
];
