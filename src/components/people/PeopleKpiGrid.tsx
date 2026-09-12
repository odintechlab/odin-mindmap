"use client";

import { useState } from "react";
import { KpiTaskPanel } from "@/components/dashboard/KpiTaskPanel";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { MemberPerformance } from "@/types/people";
import {
  IconAlarm,
  IconBars,
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconCycle,
  IconGauge,
  IconHourglass,
  IconLayers,
  IconPeople,
  IconPulse,
  PeopleKpiCard,
  type PeopleKpiAccent,
  type PeopleKpiTone,
} from "./PeopleKpiCard";
import { formatHourRange, isCoreWorkHour } from "@/lib/people/metrics";

type Panel = "completed" | "open" | "overdue" | "stale";

function onTimeAccent(rate: number | null): PeopleKpiAccent {
  if (rate === null) return "default";
  if (rate >= 80) return "success";
  if (rate >= 50) return "warning";
  return "danger";
}

function onTimeTone(rate: number | null): PeopleKpiTone {
  if (rate === null) return "sky";
  if (rate >= 80) return "emerald";
  if (rate >= 50) return "amber";
  return "rose";
}

export function PeopleKpiGrid({ stats }: { stats: MemberPerformance }) {
  const { t, formatRelativeTime } = useI18n();
  const [expanded, setExpanded] = useState<Panel | null>(null);
  const [showMore, setShowMore] = useState(false);
  const { kpis } = stats;
  const openTotal = kpis.open + kpis.inProgress;
  const openTasks = stats.openByStatus.flatMap((group) => group.tasks);

  function toggle(panel: Panel, count: number) {
    if (count === 0) return;
    setExpanded((prev) => (prev === panel ? null : panel));
  }

  const lastActive = kpis.lastActiveAt
    ? formatRelativeTime(kpis.lastActiveAt)
    : t("common.emDash");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <PeopleKpiCard
          label={t("kpi.completed")}
          value={kpis.completed}
          sublabel={t("kpi.completedSub")}
          tone="emerald"
          icon={<IconCheckCircle />}
          accent="success"
          interactive={kpis.completed > 0}
          active={expanded === "completed"}
          onClick={() => toggle("completed", kpis.completed)}
        />
        <PeopleKpiCard
          label={t("kpi.openInProgress")}
          value={openTotal}
          sublabel={t("kpi.openMix", {
            open: kpis.open,
            inProgress: kpis.inProgress,
          })}
          tone="indigo"
          icon={<IconLayers />}
          interactive={openTotal > 0}
          active={expanded === "open"}
          onClick={() => toggle("open", openTotal)}
        />
        <PeopleKpiCard
          label={t("kpi.completionRate")}
          value={`${kpis.completionRate}%`}
          sublabel={t("kpi.ofTasks", {
            done: kpis.completed,
            total: kpis.completed + openTotal,
          })}
          tone="teal"
          icon={<IconGauge />}
          accent="success"
        />
        <PeopleKpiCard
          label={t("kpi.overdue")}
          value={kpis.overdue}
          sublabel={
            openTotal > 0
              ? t("kpi.overdueRate", { pct: kpis.overdueRate })
              : t("kpi.overdueSub")
          }
          tone="rose"
          icon={<IconAlarm />}
          accent={kpis.overdue > 0 ? "danger" : "default"}
          interactive={kpis.overdue > 0}
          active={expanded === "overdue"}
          onClick={() => toggle("overdue", kpis.overdue)}
        />
        <PeopleKpiCard
          label={t("kpi.stale")}
          value={kpis.stale}
          sublabel={t("kpi.staleSub")}
          tone="amber"
          icon={<IconHourglass />}
          accent={kpis.stale > 0 ? "warning" : "default"}
          interactive={kpis.stale > 0}
          active={expanded === "stale"}
          onClick={() => toggle("stale", kpis.stale)}
        />
        <PeopleKpiCard
          label={t("kpi.lastActive")}
          value={lastActive}
          sublabel={t("kpi.lastActiveSub")}
          tone="sky"
          icon={<IconPulse />}
        />
      </div>

      {showMore ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
          <PeopleKpiCard
            label={t("kpi.throughput")}
            value={kpis.throughputPerWeek ?? t("common.emDash")}
            sublabel={t("kpi.throughputSub")}
            tone="cyan"
            icon={<IconBars />}
          />
          {kpis.onTimeRate !== null ? (
            <PeopleKpiCard
              label={t("kpi.onTime")}
              value={`${kpis.onTimeRate}%`}
              sublabel={t("kpi.onTimeSub", {
                count: kpis.onTimeCount,
                total: kpis.datedCompletions,
              })}
              tone={onTimeTone(kpis.onTimeRate)}
              icon={<IconClock />}
              accent={onTimeAccent(kpis.onTimeRate)}
            />
          ) : null}
          <PeopleKpiCard
            label={t("kpi.cycleTime")}
            value={
              kpis.cycleTimeMedianDays !== null
                ? t("kpi.cycleTimeValue", { days: kpis.cycleTimeMedianDays })
                : t("common.emDash")
            }
            sublabel={t("kpi.cycleTimeSub")}
            tone="cyan"
            icon={<IconCycle />}
          />
          <PeopleKpiCard
            label={t("kpi.touchDays")}
            value={kpis.touchDays}
            sublabel={t("kpi.touchDaysSub")}
            tone="blue"
            icon={<IconCalendar />}
          />
          <PeopleKpiCard
            label={t("kpi.mostActive")}
            value={
              kpis.peakActiveHour !== null
                ? formatHourRange(kpis.peakActiveHour)
                : t("common.emDash")
            }
            sublabel={
              kpis.peakActiveHour === null
                ? t("kpi.mostActiveSub")
                : isCoreWorkHour(kpis.peakActiveHour)
                  ? t("kpi.mostActiveSub")
                  : t("kpi.mostActiveOvertime")
            }
            tone="violet"
            icon={<IconPulse />}
          />
          <PeopleKpiCard
            label={t("kpi.collaboration")}
            value={kpis.collabTasks}
            sublabel={t(
              kpis.uniqueCollaborators === 1
                ? "kpi.collabSubOne"
                : "kpi.collabSub",
              { count: kpis.uniqueCollaborators },
            )}
            tone="orange"
            icon={<IconPeople />}
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="text-xs font-semibold text-[var(--accent)] transition-colors hover:opacity-80"
      >
        {showMore ? t("performance.hideMetrics") : t("performance.moreMetrics")}
      </button>

      {expanded === "completed" && (
        <KpiTaskPanel
          title={t("kpi.completedTasks")}
          tasks={stats.completedTasks}
          variant="success"
          onClose={() => setExpanded(null)}
        />
      )}
      {expanded === "open" && (
        <KpiTaskPanel
          title={t("kpi.openTasks")}
          tasks={openTasks}
          variant="default"
          onClose={() => setExpanded(null)}
        />
      )}
      {expanded === "overdue" && (
        <KpiTaskPanel
          title={t("kpi.overdueTasks")}
          tasks={stats.overdueTasks}
          variant="danger"
          onClose={() => setExpanded(null)}
        />
      )}
      {expanded === "stale" && (
        <KpiTaskPanel
          title={t("kpi.staleTasks")}
          tasks={stats.staleTasks}
          variant="warning"
          onClose={() => setExpanded(null)}
        />
      )}
    </div>
  );
}
