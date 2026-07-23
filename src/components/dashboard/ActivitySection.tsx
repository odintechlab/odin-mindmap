import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/dashboard/api";
import { formatRangeLabel } from "./DateRangeDropdown";
import type { DashboardStats, DashboardTaskSummary } from "@/types/dashboard";

function TaskRow({ task }: { task: DashboardTaskSummary }) {
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
          {task.listName ?? "Unknown list"} · {formatRelativeTime(task.updatedAt)}
        </p>
      </div>
      <Badge label={task.status.label} color={task.status.color} />
      <div className="flex -space-x-1.5">
        {task.assignees.slice(0, 3).map((a) => (
          <Avatar
            key={a.id}
            name={a.name}
            src={a.profilePicture}
            size={22}
          />
        ))}
      </div>
    </a>
  );
}

function WeeklySparkline({
  data,
}: {
  data: DashboardStats["weeklyCompleted"];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="mt-4 glass-inset rounded-xl border border-[var(--border-strong)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Tasks completed per week
      </p>
      <div className="mt-3 flex items-end gap-2">
        {data.map((week) => (
          <div key={week.weekLabel} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-16 w-full items-end justify-center">
              <div
                className="w-full max-w-[2.5rem] rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400 transition-all"
                style={{
                  height: `${Math.max((week.count / max) * 100, week.count > 0 ? 8 : 2)}%`,
                  minHeight: week.count > 0 ? "0.5rem" : "2px",
                }}
                title={`${week.count} completed`}
              />
            </div>
            <span className="text-[10px] font-medium text-[var(--muted)]">
              {week.weekLabel}
            </span>
            <span className="text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-300">
              {week.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ActivitySectionProps {
  recentActivity: DashboardStats["recentActivity"];
  weeklyCompleted: DashboardStats["weeklyCompleted"];
  range: DashboardStats["range"];
  from?: string | null;
  to?: string | null;
}

export function ActivitySection({
  recentActivity,
  weeklyCompleted,
  range,
  from,
  to,
}: ActivitySectionProps) {
  const periodLabel =
    from && to
      ? formatRangeLabel(from, to)
      : `Last ${range.replace("d", " days")}`;

  return (
    <section className="glass-strong rounded-2xl border border-[var(--border)] p-5 shadow-surface">
      <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
        Recent activity
      </h2>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{periodLabel}</p>

      <WeeklySparkline data={weeklyCompleted} />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Recently updated
          </h3>
          {recentActivity.updated.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No recent updates.</p>
          ) : (
            <ul className="space-y-1">
              {recentActivity.updated.map((task) => (
                <li key={task.id}>
                  <TaskRow task={task} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Recently completed
          </h3>
          {recentActivity.completed.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No recent completions.</p>
          ) : (
            <ul className="space-y-1">
              {recentActivity.completed.map((task) => (
                <li key={task.id}>
                  <TaskRow task={task} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
