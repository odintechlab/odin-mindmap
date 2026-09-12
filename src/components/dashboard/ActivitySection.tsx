"use client";

import { CollapsibleTaskGroups } from "@/components/tasks/CollapsibleTaskGroups";
import { HourlyActivityChart } from "@/components/people/charts/HourlyActivityChart";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { DashboardStats } from "@/types/dashboard";

function WeeklySparkline({
  data,
}: {
  data: DashboardStats["weeklyCompleted"];
}) {
  const { t, formatWeekLabel } = useI18n();
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="mt-4 glass-inset rounded-xl border border-[var(--border-strong)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {t("dashboard.tasksPerWeek")}
      </p>
      <div className="mt-3 flex items-end gap-2">
        {data.map((week) => (
          <div key={week.weekStartMs} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-16 w-full items-end justify-center">
              <div
                className="w-full max-w-[2.5rem] rounded-t-md bg-[var(--accent)] transition-all"
                style={{
                  height: `${Math.max((week.count / max) * 100, week.count > 0 ? 8 : 2)}%`,
                  minHeight: week.count > 0 ? "0.5rem" : "2px",
                }}
                title={t("dashboard.completedCount", { count: week.count })}
              />
            </div>
            <span className="text-[10px] font-medium text-[var(--muted)]">
              {formatWeekLabel(week.weekStartMs)}
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
  hourlyActivity: DashboardStats["hourlyActivity"];
  peakActiveHour: DashboardStats["peakActiveHour"];
  range: DashboardStats["range"];
  from?: string | null;
  to?: string | null;
}

function statusColor(
  tasks: DashboardStats["recentActivity"]["updated"],
  fallback: string,
): string {
  const color = tasks[0]?.status.color;
  return color && /^#/.test(color) ? color : fallback;
}

export function ActivitySection({
  recentActivity,
  weeklyCompleted,
  hourlyActivity,
  peakActiveHour,
  range,
  from,
  to,
}: ActivitySectionProps) {
  const { t, formatRangeLabel } = useI18n();
  const periodLabel =
    from && to
      ? formatRangeLabel(from, to)
      : t("date.lastDays", { range: range.replace("d", "") });

  const updatedGroups =
    recentActivity.updated.length === 0
      ? []
      : [
          {
            label: t("activity.updated"),
            color: statusColor(recentActivity.updated, "#0071e3"),
            count: recentActivity.updated.length,
            tasks: recentActivity.updated,
          },
        ];

  const completedGroups =
    recentActivity.completed.length === 0
      ? []
      : [
          {
            label: t("common.completed"),
            color: statusColor(recentActivity.completed, "#22c55e"),
            count: recentActivity.completed.length,
            tasks: recentActivity.completed,
          },
        ];

  return (
    <section className="glass-strong rounded-2xl border border-[var(--border)] p-5 shadow-surface">
      <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
        {t("dashboard.recentActivity")}
      </h2>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{periodLabel}</p>

      <WeeklySparkline data={weeklyCompleted} />

      <HourlyActivityChart
        data={hourlyActivity}
        variant="inset"
        titleKey="charts.teamHourlyActivity"
        sublabelKey="charts.teamHourlyActivitySub"
        peakHour={peakActiveHour}
      />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {t("dashboard.recentlyUpdated")}
          </h3>
          <CollapsibleTaskGroups
            groups={updatedGroups}
            emptyLabel={t("dashboard.noRecentUpdates")}
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {t("dashboard.recentlyCompleted")}
          </h3>
          <CollapsibleTaskGroups
            groups={completedGroups}
            emptyLabel={t("dashboard.noRecentCompletions")}
          />
        </div>
      </div>
    </section>
  );
}
