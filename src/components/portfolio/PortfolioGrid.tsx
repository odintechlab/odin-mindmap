import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/dashboard/api";
import type { DashboardTaskSummary } from "@/types/dashboard";
import type { PortfolioPersonOverdue, PortfolioProject, PortfolioStats } from "@/types/portfolio";

function TaskRow({ task }: { task: DashboardTaskSummary }) {
  return (
    <a
      href={task.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--panel-solid)]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {task.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
          {task.listName ?? "Unknown list"}
          {task.updatedAt ? ` · ${formatRelativeTime(task.updatedAt)}` : ""}
        </p>
      </div>
      <Badge label={task.status.label} color={task.status.color} />
    </a>
  );
}

function ProjectCard({ project }: { project: PortfolioProject }) {
  const pct = project.completionRate;

  return (
    <div className="glass-strong rounded-2xl border border-[var(--border)] p-4 shadow-surface">
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {project.name}
        </h3>
        <span className="shrink-0 text-xs font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
          {pct}%
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[var(--muted)]">Open</span>
          <p className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">{project.open}</p>
        </div>
        <div>
          <span className="text-[var(--muted)]">In progress</span>
          <p className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">{project.inProgress}</p>
        </div>
        <div>
          <span className="text-[var(--muted)]">Done</span>
          <p className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">{project.closed}</p>
        </div>
        <div>
          <span className="text-[var(--muted)]">Overdue</span>
          <p className={`font-semibold tabular-nums ${project.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-800 dark:text-zinc-100"}`}>
            {project.overdue}
          </p>
        </div>
      </div>
      {project.velocityPerWeek != null && (
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          ~{project.velocityPerWeek}/wk velocity
        </p>
      )}
    </div>
  );
}

function OverduePersonRow({ person }: { person: PortfolioPersonOverdue }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2">
      <Avatar name={person.name} src={person.profilePicture} size={28} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
        {person.name}
      </span>
      <span className="shrink-0 rounded-lg bg-red-50 px-2 py-0.5 text-xs font-bold tabular-nums text-red-700 dark:bg-red-950/40 dark:text-red-300">
        {person.overdueCount}
      </span>
    </div>
  );
}

interface PortfolioGridProps {
  stats: PortfolioStats;
}

export function PortfolioGrid({ stats }: PortfolioGridProps) {
  return (
    <div className="space-y-6 overflow-y-auto p-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Portfolio</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Multi-project rollup sorted by health — overdue first, then lowest completion.
        </p>
      </div>

      {stats.projects.length === 0 ? (
        <div className="glass-strong flex h-48 items-center justify-center rounded-2xl border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">No projects found for this workspace.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stats.projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-strong rounded-2xl border border-[var(--border)] p-5 shadow-surface">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Top overdue people
          </h3>
          {stats.topOverduePeople.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No overdue assignees.</p>
          ) : (
            <div className="mt-3 divide-y divide-[var(--border)]">
              {stats.topOverduePeople.map((p) => (
                <OverduePersonRow key={p.id} person={p} />
              ))}
            </div>
          )}
        </section>

        <section className="glass-strong rounded-2xl border border-[var(--border)] p-5 shadow-surface">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Stale tasks (14d+ no update)
          </h3>
          {stats.staleTasks.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">All active tasks recently updated.</p>
          ) : (
            <div className="mt-3 space-y-1">
              {stats.staleTasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="glass-strong rounded-2xl border border-[var(--border)] p-5 shadow-surface">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          At-risk milestones
        </h3>
        {stats.atRiskMilestones.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">No milestones due within 7 days.</p>
        ) : (
          <div className="mt-3 space-y-1">
            {stats.atRiskMilestones.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>

      <section className="glass-inset rounded-2xl border border-dashed border-[var(--border-strong)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Phase 2
        </p>
        <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
          <li>{stats.phase2.customFields}</li>
          <li>{stats.phase2.forms}</li>
          <li>{stats.phase2.attachments}</li>
        </ul>
      </section>
    </div>
  );
}
