"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { TYPE_COLORS } from "@/lib/mindmap/constants";
import type { MindMapNodeData } from "@/types/mindmap";

function formatDueDate(ms: string | null | undefined): string | null {
  if (!ms) return null;
  const date = new Date(parseInt(ms, 10));
  if (isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function MindMapNodeComponent({ data }: NodeProps) {
  const node = data as MindMapNodeData;
  const isTask = node.type === "task" || node.type === "subtask";
  const accent = TYPE_COLORS[node.type] ?? "#6366f1";
  const due = formatDueDate(node.dueDate);

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-zinc-400 !w-2 !h-2 !border-0" />
      <div
        className={`
          w-[220px] rounded-xl border bg-[var(--panel)] shadow-sm transition-all duration-200
          ${node.isSelected ? "ring-2 ring-indigo-500 shadow-md" : ""}
          ${node.isOnPath && !node.isSelected ? "border-indigo-300 dark:border-indigo-700" : "border-[var(--border)]"}
        `}
        style={{ borderLeftWidth: 3, borderLeftColor: accent }}
      >
        <div className="px-3 py-2.5">
          <div className="flex items-start gap-2">
            {node.hasChildren && (
              <button
                type="button"
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                data-expand-toggle
              >
                {node.isLoading ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-500" />
                ) : (
                  <span
                    className="text-[10px] transition-transform duration-150"
                    style={{ transform: node.isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                  >
                    ▶
                  </span>
                )}
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight text-zinc-900 dark:text-zinc-100">
                {node.label}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                {node.type}
                {node.childCount != null && !node.childrenLoaded
                  ? ` · ${node.childCount}`
                  : ""}
              </p>
            </div>
            {node.assignees && node.assignees.length > 0 && (
              <div className="flex -space-x-1.5 shrink-0">
                {node.assignees.slice(0, 2).map((a) => (
                  <Avatar key={a.username} name={a.username} src={a.profilePicture} size={20} />
                ))}
              </div>
            )}
          </div>

          {isTask && (node.status || node.priority || due) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {node.status && (
                <Badge label={node.status.name} color={node.status.color} />
              )}
              {node.priority && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: node.priority.color }}
                  title={node.priority.label}
                />
              )}
              {due && (
                <span className="text-[10px] text-zinc-400">{due}</span>
              )}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-zinc-400 !w-2 !h-2 !border-0" />
    </>
  );
}

export const MindMapNode = memo(MindMapNodeComponent);
