"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { CollapsibleTaskGroups } from "@/components/tasks/CollapsibleTaskGroups";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { personHref, rosterHref } from "@/lib/people/api";
import { INSIGHT_MESSAGE_KEYS } from "@/lib/people/metrics";
import type { MemberPerformance, PeopleStatusGroup } from "@/types/people";
import { ActivitySignalChart } from "./charts/ActivitySignalChart";
import { HourlyActivityChart } from "./charts/HourlyActivityChart";
import { PriorityMixChart } from "./charts/PriorityMixChart";
import { ProjectMixChart } from "./charts/ProjectMixChart";
import { StatusMixChart } from "./charts/StatusMixChart";
import { WeeklyCompletionsChart } from "./charts/WeeklyCompletionsChart";
import { ExportPerformanceButton } from "./ExportPerformanceButton";
import { PerformanceGradeBadge } from "./PerformanceGradeBadge";
import { PeopleKpiGrid } from "./PeopleKpiGrid";

interface PersonPerformanceProps {
  stats: MemberPerformance;
  query: URLSearchParams;
}

export function PersonPerformance({
  stats,
  query,
}: PersonPerformanceProps) {
  const { t } = useI18n();
  const { member, neighbors, insights, percentiles, kpis, grade } = stats;
  const total = kpis.completed + kpis.open + kpis.inProgress;
  const projectName = stats.listId
    ? stats.projects.find((p) => p.id === stats.listId)?.name ?? null
    : null;

  const completedGroups: PeopleStatusGroup[] =
    stats.completedTasks.length === 0
      ? []
      : [
          {
            label: t("common.completed"),
            color:
              stats.completedTasks[0]?.status.color &&
              /^#/.test(stats.completedTasks[0].status.color)
                ? stats.completedTasks[0].status.color
                : "#22c55e",
            count: stats.completedTasks.length,
            tasks: stats.completedTasks,
          },
        ];

  return (
    <div className="custom-scrollbar space-y-6 overflow-y-auto p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={member.name} src={member.profilePicture} size={56} />
          <div className="min-w-0">
            <p className="truncate text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {member.name}
            </p>
            {percentiles && percentiles.sampleSize > 1 ? (
              <p className="mt-1.5 text-sm leading-snug text-[var(--muted)]">
                {percentiles.completed !== null
                  ? t("performance.moreCompletions", {
                      pct: percentiles.completed,
                    })
                  : null}
                {percentiles.completed !== null && percentiles.overdue !== null
                  ? " · "
                  : null}
                {percentiles.overdue !== null
                  ? t("performance.fewerOverdue", { pct: percentiles.overdue })
                  : null}
                . {t("performance.amongPeople")}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ExportPerformanceButton stats={stats} projectName={projectName} />
          <Link
            href={rosterHref(query)}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--panel-solid)] hover:text-zinc-800 dark:hover:text-zinc-100"
          >
            {t("performance.backToRoster")}
          </Link>
          <Link
            href={
              neighbors.prevId !== null
                ? personHref(neighbors.prevId, query)
                : "#"
            }
            aria-disabled={neighbors.prevId === null}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              neighbors.prevId === null
                ? "pointer-events-none text-zinc-400 dark:text-zinc-600"
                : "text-[var(--accent-foreground)] hover:bg-[var(--accent-soft)]"
            }`}
          >
            {t("performance.previous")}
          </Link>
          <Link
            href={
              neighbors.nextId !== null
                ? personHref(neighbors.nextId, query)
                : "#"
            }
            aria-disabled={neighbors.nextId === null}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              neighbors.nextId === null
                ? "pointer-events-none text-zinc-400 dark:text-zinc-600"
                : "text-[var(--accent-foreground)] hover:bg-[var(--accent-soft)]"
            }`}
          >
            {t("performance.next")}
          </Link>
        </div>
      </div>

      <PerformanceGradeBadge grade={grade} improvements={stats.improvements} />

      {total === 0 ? (
        <section className="glass-strong rounded-2xl border border-[var(--border)] p-5 shadow-surface">
          <p className="text-sm text-[var(--muted)]">
            {t("performance.noAssignedFilter")}
          </p>
        </section>
      ) : (
        <>
          <PeopleKpiGrid stats={stats} />

          <div className="grid gap-6 lg:grid-cols-2">
            <WeeklyCompletionsChart data={stats.weeklyCompleted} />
            <ActivitySignalChart data={stats.weeklyActivity} />
          </div>

          <HourlyActivityChart
            data={stats.hourlyActivity}
            peakHour={stats.kpis.peakActiveHour}
          />

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <StatusMixChart data={stats.byStatus} />
            <ProjectMixChart data={stats.byProject} />
            <PriorityMixChart data={stats.byPriority} />
          </div>

          {insights.length > 0 ? (
            <section className="glass-strong rounded-2xl border border-[var(--border)] p-5 shadow-surface">
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                {t("performance.whatToLook")}
              </h2>
              <ul className="mt-3 space-y-2">
                {insights.map((insight) => (
                  <li
                    key={insight.id}
                    className="text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    {t(INSIGHT_MESSAGE_KEYS[insight.id], insight.params)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-2">
              <div>
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  {t("performance.workNow")}
                </h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {t("performance.workNowSub")}
                </p>
              </div>
              <CollapsibleTaskGroups
                groups={stats.openByStatus}
                emptyLabel={t("performance.noOpenWork")}
              />
            </section>

            <section className="space-y-2">
              <div>
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  {t("performance.recentCompleted")}
                </h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {t("performance.lastFinished", {
                    count: stats.completedTasks.length,
                  })}
                </p>
              </div>
              <CollapsibleTaskGroups
                groups={completedGroups}
                emptyLabel={t("performance.noCompletions")}
              />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
