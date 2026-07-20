"use client";

import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/dashboard/api";
import type { TimelineBar } from "@/types/timeline";

interface TimelineDetailPanelProps {
  bar: TimelineBar | null;
  onClose: () => void;
}

export function TimelineDetailPanel({ bar, onClose }: TimelineDetailPanelProps) {
  if (!bar) return null;

  return (
    <aside className="glass-strong w-80 shrink-0 overflow-y-auto border-l border-[var(--border)] p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {bar.task.name}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--panel-solid)] hover:text-zinc-800 dark:hover:text-zinc-100"
          title="Close"
        >
          Close
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge label={bar.task.status.label} color={bar.task.status.color} />
        {bar.task.listName && (
          <span className="rounded-lg border border-[var(--border)] bg-[var(--panel-solid)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)]">
            {bar.task.listName}
          </span>
        )}
      </div>

      <div className="mt-4 glass-inset rounded-2xl border border-[var(--border-strong)] p-4">
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-[var(--muted)]">Start</dt>
            <dd className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-200">
              {formatDate(String(bar.startMs))}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">End</dt>
            <dd className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-200">
              {bar.task.dueDate ? formatDate(bar.task.dueDate) : formatDate(String(bar.endMs))}
            </dd>
          </div>
        </dl>
      </div>

      <a
        href={bar.task.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--panel-solid)] px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
      >
        Open in ClickUp <span aria-hidden>→</span>
      </a>
    </aside>
  );
}
