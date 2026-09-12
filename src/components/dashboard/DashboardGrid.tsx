"use client";

import { useI18n } from "@/components/i18n/LocaleProvider";
import { ActivitySection } from "./ActivitySection";
import { ForecastTimeline } from "./ForecastTimeline";
import { GoalsSection } from "./GoalsSection";
import { KpiGrid } from "./KpiGrid";
import { MilestoneSection } from "./MilestoneSection";
import { TeamWorkloadSection } from "./TeamWorkloadSection";
import type { DashboardStats } from "@/types/dashboard";

interface DashboardGridProps {
  stats: DashboardStats;
}

export function DashboardGrid({ stats }: DashboardGridProps) {
  const { t, formatRangeLabel } = useI18n();
  const activeProject = stats.listId
    ? stats.projects.find((p) => p.id === stats.listId)
    : null;
  const periodLabel =
    stats.from && stats.to ? formatRangeLabel(stats.from, stats.to) : null;

  return (
    <div className="custom-scrollbar space-y-6 overflow-y-auto p-6">
      {(activeProject || periodLabel) && (
        <p className="text-xs font-medium text-[var(--muted)]">
          {periodLabel && (
            <>
              {t("dashboard.showing")}{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {periodLabel}
              </span>
            </>
          )}
          {periodLabel && activeProject ? " · " : null}
          {activeProject && (
            <>
              {periodLabel ? null : `${t("dashboard.showing")} `}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {activeProject.name}
              </span>{" "}
              {t("dashboard.only")}
            </>
          )}
        </p>
      )}
      <KpiGrid totals={stats.totals} dueTasks={stats.dueTasks} />
      <ForecastTimeline
        forecast={stats.forecast}
        weeklyCompleted={stats.weeklyCompleted}
        milestoneForecast={stats.nextMilestoneForecast}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <MilestoneSection
          milestones={stats.milestones}
          nextMilestoneForecast={stats.nextMilestoneForecast}
        />
        {stats.listId ? (
          <section className="glass-strong rounded-2xl border border-[var(--border)] p-5 shadow-surface">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
              {t("dashboard.goalsKpis")}
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {t("dashboard.goalsWorkspaceWide")}
            </p>
          </section>
        ) : (
          <GoalsSection goals={stats.goals} />
        )}
      </div>
      <TeamWorkloadSection teamWorkload={stats.teamWorkload} />
      <ActivitySection
        recentActivity={stats.recentActivity}
        weeklyCompleted={stats.weeklyCompleted}
        hourlyActivity={stats.hourlyActivity}
        peakActiveHour={stats.peakActiveHour}
        range={stats.range}
        from={stats.from}
        to={stats.to}
      />
    </div>
  );
}
