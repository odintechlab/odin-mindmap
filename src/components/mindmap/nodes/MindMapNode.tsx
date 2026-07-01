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

function ChevronIcon({ expanded }: { expanded?: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="currentColor"
      className="transition-transform duration-200"
      style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
    >
      <path d="M3 1.5L7.5 5L3 8.5" />
    </svg>
  );
}

function TeamworkIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 opacity-95"
    >
      <circle cx="5.5" cy="4.5" r="2.25" />
      <circle cx="10.5" cy="4.5" r="2.25" />
      <path d="M1.5 13.5c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" />
      <path d="M6.5 13.5c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" />
    </svg>
  );
}

function CollaborationBadge({ assigneeCount }: { assigneeCount: number }) {
  return (
    <span
      className="inline-flex h-4 items-center gap-1 rounded-full border border-[var(--border-strong)] bg-black/[0.03] px-1.5 text-[9px] font-semibold tracking-wide text-[var(--muted)] dark:bg-white/[0.06]"
      title={`Collaboration · ${assigneeCount} people`}
    >
      <TeamworkIcon />
      <span className="truncate">Collaboration</span>
    </span>
  );
}

function MindMapNodeComponent({ data }: NodeProps) {
  const node = data as MindMapNodeData;
  const isTask = node.type === "task" || node.type === "subtask";
  const isMember = node.type === "member";
  const isLoadMore = node.type === "loadmore";
  const accent = isLoadMore ? "#6366f1" : (TYPE_COLORS[node.type] ?? "#6366f1");
  const due = formatDueDate(node.dueDate);
  const width = node.compact ? "w-[200px]" : "w-[220px]";
  const assigneeCount = node.assignees?.length ?? 0;
  const isCollab = isTask && assigneeCount > 1;
  const canAddInline = Boolean(node.addTaskListId);

  const handleClass = "!w-1.5 !h-1.5 !border-0 !bg-[var(--muted)] !opacity-0";

  if (isLoadMore) {
    return (
      <>
        <Handle type="target" position={Position.Left} className={handleClass} />
        <button
          type="button"
          data-load-more
          className={`${width} group rounded-xl border border-dashed border-indigo-400/60 bg-indigo-50/80 px-3 py-2.5 text-sm font-semibold text-indigo-600 backdrop-blur-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-100/80 hover:shadow-md dark:border-indigo-500/40 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:border-indigo-400/60 dark:hover:bg-indigo-950/50`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-60 group-hover:opacity-100 transition-opacity">
              <path d="M8 3v10M3 8h10" />
            </svg>
            {node.label}
          </span>
        </button>
        <Handle type="source" position={Position.Right} className="!bg-transparent !w-0 !h-0 !border-0" />
      </>
    );
  }

  return (
    <>
      <Handle type="target" position={Position.Left} className={handleClass} />
      <div
        className={`
          ${width} group/node glass-strong rounded-xl border shadow-surface
          transition-all duration-200 cursor-pointer
          hover:shadow-surface-lg hover:-translate-y-px
          ${node.isSelected ? "ring-2 ring-[var(--accent)]/50 shadow-surface-lg" : ""}
          ${node.isOnPath && !node.isSelected ? "border-[var(--accent)]/30" : "border-[var(--border)]"}
        `}
        style={{
          borderLeftWidth: 3,
          borderLeftColor: accent,
          ...(node.isSelected ? { boxShadow: `var(--surface-shadow-lg), 0 0 20px var(--accent-glow)` } : {}),
        }}
      >
        <div className={node.compact ? "px-2.5 py-2" : "px-3 py-2.5"}>
          <div className="flex items-start gap-2">
            {node.hasChildren && (
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors group-hover/node:text-indigo-500 dark:group-hover/node:text-indigo-400">
                {node.isLoading ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-200 border-t-[var(--accent)]" />
                ) : (
                  <ChevronIcon expanded={node.isExpanded} />
                )}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className={`min-w-0 flex-1 truncate font-semibold leading-tight text-zinc-900 dark:text-zinc-50 ${node.compact ? "text-xs" : "text-sm"}`}>
                  {node.label}
                </p>
                {isCollab && (
                  <span className="shrink-0">
                    <CollaborationBadge assigneeCount={assigneeCount} />
                  </span>
                )}
                {canAddInline && (
                  <button
                    type="button"
                    data-add-inline
                    title={node.addTaskParentTaskId ? "Add subtask" : "Add task"}
                    className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-50/70 text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100/70 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                  </button>
                )}
              </div>
              {!node.compact && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className="inline-flex rounded px-1 py-px text-[9px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {node.type}
                  </span>
                  {node.childCount != null && !node.childrenLoaded && (
                    <span className="text-[10px] font-medium text-[var(--muted)]">
                      {node.childCount} items
                    </span>
                  )}
                </div>
              )}
            </div>
            {!node.compact && node.assignees && node.assignees.length > 0 && (
              <div className={`flex shrink-0 ${isMember ? "" : "-space-x-1.5"}`}>
                {node.assignees.slice(0, isMember ? 1 : 2).map((a) => (
                  <Avatar
                    key={a.username}
                    name={a.username}
                    src={a.profilePicture}
                    size={isMember ? 28 : 20}
                  />
                ))}
              </div>
            )}
          </div>

          {isTask && !node.compact && (node.status || node.priority || due) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {node.status && (
                <Badge label={node.status.name} color={node.status.color} />
              )}
              {node.priority && (
                <span
                  className="h-2 w-2 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: node.priority.color }}
                  title={node.priority.label}
                />
              )}
              {due && (
                <span className="text-[10px] font-medium text-[var(--muted)]">{due}</span>
              )}
            </div>
          )}

          {isTask && node.compact && node.status && (
            <div className="mt-1">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: node.status.color }}
                title={node.status.name}
              />
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className={handleClass} />
    </>
  );
}

export const MindMapNode = memo(MindMapNodeComponent);
