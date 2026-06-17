"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/dashboard/api";
import type { TimelineBar, TimelineStats } from "@/types/timeline";

const ROW_HEIGHT = 36;
const LABEL_WIDTH = 160;
const DAY_MS = 86_400_000;
const AXIS_HEIGHT = 34;

function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

interface TimelineCanvasProps {
  stats: TimelineStats;
}

export function TimelineCanvas({ stats }: TimelineCanvasProps) {
  const [selected, setSelected] = useState<TimelineBar | null>(null);
  const span = stats.rangeEnd - stats.rangeStart || DAY_MS;
  const chartWidth = Math.max(840, Math.ceil(span / DAY_MS) * 12);

  const rows = new Map<string, TimelineBar[]>();
  for (const bar of stats.bars) {
    const bucket = rows.get(bar.rowLabel) ?? [];
    bucket.push(bar);
    rows.set(bar.rowLabel, bucket);
  }

  const rowLabels = [...rows.keys()].sort((a, b) => a.localeCompare(b));

  if (stats.bars.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="glass-strong max-w-md rounded-2xl border border-[var(--border)] p-8 text-center shadow-surface">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            No tasks with start or due dates
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Add start_date or due_date on tasks in ClickUp to see them on the timeline.
          </p>
        </div>
      </div>
    );
  }

  const toX = (ms: number) =>
    LABEL_WIDTH + ((ms - stats.rangeStart) / span) * chartWidth;

  const now = Date.now();
  const todayX =
    now >= stats.rangeStart && now <= stats.rangeEnd ? toX(now) : null;
  const rangeLabel = `${formatDate(String(stats.rangeStart))} → ${formatDate(String(stats.rangeEnd))}`;

  return (
    <div className="flex h-full min-h-0">
      <div className="min-w-0 flex-1 overflow-auto p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Timeline</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {stats.bars.length} task{stats.bars.length === 1 ? "" : "s"} · grouped by {stats.groupBy}
            </p>
          </div>
          <div className="glass-solid rounded-xl border border-[var(--border-strong)] px-3 py-2 text-xs text-[var(--muted)]">
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">Range</span>
            <span className="ml-2 tabular-nums">{rangeLabel}</span>
          </div>
        </div>

        <div className="glass-strong overflow-x-auto rounded-2xl border border-[var(--border)] shadow-surface">
          <svg
            width={LABEL_WIDTH + chartWidth + 24}
            height={AXIS_HEIGHT + rowLabels.length * ROW_HEIGHT + 30}
            className="block"
          >
            {/* Axis + grid */}
            {Array.from({ length: 7 }).map((_, i) => {
              const t = stats.rangeStart + (span * i) / 6;
              const x = toX(t);
              return (
                <g key={i}>
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={AXIS_HEIGHT + rowLabels.length * ROW_HEIGHT + 14}
                    stroke="var(--border)"
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={AXIS_HEIGHT - 12}
                    textAnchor="middle"
                    className="fill-[var(--muted)] text-[10px]"
                  >
                    {formatDay(t)}
                  </text>
                </g>
              );
            })}

            {/* Left gutter divider */}
            <line
              x1={LABEL_WIDTH - 6}
              y1={0}
              x2={LABEL_WIDTH - 6}
              y2={AXIS_HEIGHT + rowLabels.length * ROW_HEIGHT + 14}
              stroke="var(--border-strong)"
              strokeWidth={1}
            />

            {/* Today marker */}
            {todayX !== null && (
              <g>
                <line
                  x1={todayX}
                  y1={0}
                  x2={todayX}
                  y2={AXIS_HEIGHT + rowLabels.length * ROW_HEIGHT + 14}
                  stroke="#f97316"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0.9}
                />
                <text
                  x={todayX + 6}
                  y={12}
                  className="fill-orange-600 text-[10px] font-semibold dark:fill-orange-300"
                >
                  Today
                </text>
              </g>
            )}

            {rowLabels.map((label, rowIndex) => {
              const y = AXIS_HEIGHT + rowIndex * ROW_HEIGHT + 8;
              const stripe = rowIndex % 2 === 0;
              return (
                <g key={label}>
                  {/* Row stripe */}
                  <rect
                    x={0}
                    y={AXIS_HEIGHT + rowIndex * ROW_HEIGHT}
                    width={LABEL_WIDTH + chartWidth + 24}
                    height={ROW_HEIGHT}
                    fill={stripe ? "rgba(99, 102, 241, 0.03)" : "transparent"}
                    opacity={0.9}
                  />

                  <text
                    x={8}
                    y={y + 14}
                    className="fill-zinc-700 text-[11px] font-medium dark:fill-zinc-300"
                  >
                    {label.length > 20 ? `${label.slice(0, 18)}…` : label}
                  </text>

                  {/* Row divider */}
                  <line
                    x1={0}
                    y1={AXIS_HEIGHT + (rowIndex + 1) * ROW_HEIGHT}
                    x2={LABEL_WIDTH + chartWidth + 24}
                    y2={AXIS_HEIGHT + (rowIndex + 1) * ROW_HEIGHT}
                    stroke="var(--border)"
                    strokeWidth={1}
                    opacity={0.7}
                  />

                  {(rows.get(label) ?? []).map((bar) => {
                    const x1 = toX(bar.startMs);
                    const x2 = toX(bar.endMs);
                    const w = Math.max(x2 - x1, 4);
                    const isSelected = selected?.task.id === bar.task.id;
                    const fill = bar.task.status.color || "#818cf8";
                    const showText = w >= 90;
                    const textX = x1 + clamp(w / 2, 22, w - 22);
                    return (
                      <g
                        key={bar.task.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(bar)}
                      >
                        <rect
                          x={x1}
                          y={y}
                          width={w}
                          height={20}
                          rx={6}
                          fill={fill}
                          opacity={isSelected ? 0.95 : 0.85}
                          stroke={isSelected ? "white" : "transparent"}
                          strokeWidth={isSelected ? 1.5 : 0}
                        >
                          <title>{bar.task.name}</title>
                        </rect>
                        {showText && (
                          <text
                            x={textX}
                            y={y + 14}
                            textAnchor="middle"
                            className="select-none fill-white text-[10px] font-semibold"
                            opacity={0.92}
                          >
                            {bar.task.name.length > 22 ? `${bar.task.name.slice(0, 20)}…` : bar.task.name}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {selected && (
        <aside className="glass-strong w-80 shrink-0 overflow-y-auto border-l border-[var(--border)] p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {selected.task.name}
            </h3>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--panel-solid)] hover:text-zinc-800 dark:hover:text-zinc-100"
              title="Close"
            >
              Close
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge label={selected.task.status.label} color={selected.task.status.color} />
            {selected.task.listName && (
              <span className="rounded-lg border border-[var(--border)] bg-[var(--panel-solid)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)]">
                {selected.task.listName}
              </span>
            )}
          </div>

          <div className="mt-4 glass-inset rounded-2xl border border-[var(--border-strong)] p-4">
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-[var(--muted)]">Start</dt>
                <dd className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-200">
                  {formatDate(String(selected.startMs))}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">End</dt>
                <dd className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-200">
                  {selected.task.dueDate ? formatDate(selected.task.dueDate) : formatDate(String(selected.endMs))}
                </dd>
              </div>
            </dl>
          </div>

          <a
            href={selected.task.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--panel-solid)] px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
          >
            Open in ClickUp <span aria-hidden>→</span>
          </a>
        </aside>
      )}
    </div>
  );
}
