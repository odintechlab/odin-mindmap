export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 72;
export const NODE_HEIGHT_COMPACT = 48;

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
};
