"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/dashboard/api";
import type { ActivityEvent, ActivityStats } from "@/types/activity";

function EventRow({ event }: { event: ActivityEvent }) {
  const { task } = event;
  const kindLabel = event.kind === "completed" ? "Completed" : "Updated";

  return (
    <a
      href={task.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--panel-solid)]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {task.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
          {kindLabel} · {task.listName ?? "Unknown list"} · {formatRelativeTime(event.at)}
        </p>
      </div>
      <Badge label={task.status.label} color={task.status.color} />
      <div className="flex -space-x-1.5">
        {task.assignees.slice(0, 3).map((a) => (
          <Avatar key={a.id} name={a.name} src={a.profilePicture} size={22} />
        ))}
      </div>
    </a>
  );
}

interface ActivityFeedProps {
  stats: ActivityStats;
}

export function ActivityFeed({ stats }: ActivityFeedProps) {
  const byDay = new Map<string, ActivityEvent[]>();
  for (const event of stats.events) {
    const bucket = byDay.get(event.dayLabel) ?? [];
    bucket.push(event);
    byDay.set(event.dayLabel, bucket);
  }

  return (
    <div className="space-y-6 overflow-y-auto p-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Activity</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Task updates and completions over the last {stats.range}.
        </p>
      </div>

      {stats.events.length === 0 ? (
        <div className="glass-strong flex h-48 items-center justify-center rounded-2xl border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">No activity in this range.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([day, events]) => (
            <section key={day}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                {day}
              </h3>
              <div className="glass-strong rounded-2xl border border-[var(--border)] p-2 shadow-surface">
                {events.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="glass-inset rounded-2xl border border-dashed border-[var(--border-strong)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Phase 2
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">{stats.phase2.forms}</p>
      </section>
    </div>
  );
}
