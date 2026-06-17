import { formatDate } from "@/lib/dashboard/api";
import type {
  DashboardForecast,
  DashboardMilestoneForecast,
} from "@/types/dashboard";

interface WeeklyPoint {
  weekLabel: string;
  count: number;
}

interface ForecastTimelineProps {
  forecast: DashboardForecast;
  weeklyCompleted: WeeklyPoint[];
  milestoneForecast?: DashboardMilestoneForecast | null;
}

interface SeriesPoint {
  dateMs: number;
  remaining: number;
  label: string;
}

interface BurndownData {
  history: SeriesPoint[];
  today: SeriesPoint;
  goal: SeriesPoint | null;
}

const WEEK_MS = 7 * 86_400_000;

function startOfWeek(ts: number): number {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d.getTime();
}

function confidenceLabel(
  confidence: DashboardForecast["confidence"],
): string | null {
  if (confidence === "low") return "Low confidence";
  if (confidence === "none") return "Insufficient data";
  return null;
}

function describeForecast(
  forecast: DashboardForecast,
  milestoneForecast?: DashboardMilestoneForecast | null,
): string {
  if (forecast.remaining <= 0) {
    return "Backlog is clear — all open and in-progress tasks are done.";
  }
  if (!forecast.estimatedCompletion || !forecast.velocityPerWeek) {
    return `${forecast.remaining} task${forecast.remaining === 1 ? "" : "s"} open — not enough recent completions to project a finish date yet.`;
  }

  const date = formatDate(forecast.estimatedCompletion);
  let text = `~${forecast.velocityPerWeek}/wk pace → clear by ${date}`;
  if (forecast.weeksRemaining != null && forecast.weeksRemaining > 0) {
    text += ` (${forecast.weeksRemaining} wk)`;
  }

  if (milestoneForecast?.status === "at_risk") {
    text += ` · milestone at risk`;
  } else if (milestoneForecast?.status === "on_track") {
    text += ` · on track for next milestone`;
  }

  return text;
}

function buildBurndownData(
  forecast: DashboardForecast,
  weeklyCompleted: WeeklyPoint[],
): BurndownData {
  const now = Date.now();
  const remaining = forecast.remaining;
  const counts = weeklyCompleted.map((w) => w.count);

  const weekStarts: number[] = [];
  for (let i = weeklyCompleted.length - 1; i >= 0; i--) {
    weekStarts.push(startOfWeek(now - i * WEEK_MS));
  }

  const history: SeriesPoint[] = [];
  let backfill = remaining;
  for (let i = weekStarts.length - 1; i >= 0; i--) {
    backfill += counts[i] ?? 0;
    history.unshift({
      dateMs: weekStarts[i],
      remaining: backfill,
      label: weeklyCompleted[i]?.weekLabel ?? "",
    });
  }

  const today: SeriesPoint = { dateMs: now, remaining, label: "Now" };

  const goal: SeriesPoint | null =
    forecast.estimatedCompletion && remaining > 0
      ? {
          dateMs: new Date(forecast.estimatedCompletion).getTime(),
          remaining: 0,
          label: formatDate(forecast.estimatedCompletion),
        }
      : remaining <= 0
        ? { dateMs: now, remaining: 0, label: "Done" }
        : null;

  return { history, today, goal };
}

function RemainingBars({ data }: { data: BurndownData }) {
  const bars: { point: SeriesPoint; kind: "history" | "today" | "goal" }[] = [
    ...data.history.map((point) => ({ point, kind: "history" as const })),
    { point: data.today, kind: "today" },
    ...(data.goal ? [{ point: data.goal, kind: "goal" as const }] : []),
  ];

  const max = Math.max(...bars.map((b) => b.point.remaining), 1);

  if (bars.length < 2) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--muted)]">
        Not enough history to show a trend yet.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)]/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Remaining over time
        </p>
        <div className="flex items-center gap-3 text-[10px] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-gradient-to-t from-indigo-600 to-indigo-400" />
            Past
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm ring-2 ring-indigo-500 bg-indigo-400" />
            Now
          </span>
          {data.goal && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm border border-dashed border-violet-400 bg-violet-400/30" />
              Goal
            </span>
          )}
        </div>
      </div>

      <div className="flex items-end gap-1.5 sm:gap-2">
        {bars.map(({ point, kind }) => {
          const pct = Math.max((point.remaining / max) * 100, point.remaining > 0 ? 10 : 4);
          const isGoal = kind === "goal";
          const isToday = kind === "today";

          return (
            <div
              key={`${kind}-${point.dateMs}`}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span className="text-[10px] font-bold tabular-nums text-zinc-700 dark:text-zinc-300">
                {point.remaining}
              </span>
              <div className="flex h-20 w-full items-end sm:h-24">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    isGoal
                      ? "border border-dashed border-violet-400 bg-violet-400/25"
                      : isToday
                        ? "bg-gradient-to-t from-indigo-600 to-indigo-400 ring-2 ring-indigo-500/60 ring-offset-1 ring-offset-[var(--panel-solid)]"
                        : "bg-gradient-to-t from-indigo-600 to-indigo-400"
                  }`}
                  style={{
                    height: `${pct}%`,
                    minHeight: point.remaining > 0 ? "0.5rem" : "4px",
                  }}
                  title={`${point.label}: ${point.remaining} tasks`}
                />
              </div>
              <span
                className={`w-full truncate text-center text-[9px] font-medium sm:text-[10px] ${
                  isToday
                    ? "font-semibold text-indigo-600 dark:text-indigo-400"
                    : isGoal
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-[var(--muted)]"
                }`}
              >
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ForecastTimeline({
  forecast,
  weeklyCompleted,
  milestoneForecast,
}: ForecastTimelineProps) {
  const badge = confidenceLabel(forecast.confidence);
  const description = describeForecast(forecast, milestoneForecast);
  const chartData = buildBurndownData(forecast, weeklyCompleted);

  const finishLabel =
    forecast.estimatedCompletion && forecast.remaining > 0
      ? formatDate(forecast.estimatedCompletion)
      : forecast.remaining <= 0
        ? "Done"
        : "—";

  return (
    <section className="glass-strong rounded-2xl border border-[var(--border)] p-4 shadow-surface">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
            Backlog forecast
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
        </div>
        {badge && (
          <span className="shrink-0 rounded-md border border-[var(--border-strong)] bg-[var(--panel-solid)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricPill label="Remaining" value={String(forecast.remaining)} />
        <MetricPill
          label="Velocity"
          value={
            forecast.velocityPerWeek != null
              ? `~${forecast.velocityPerWeek}/wk`
              : "—"
          }
        />
        <MetricPill
          label="Weeks left"
          value={
            forecast.weeksRemaining != null && forecast.weeksRemaining > 0
              ? `~${forecast.weeksRemaining}`
              : forecast.remaining <= 0
                ? "0"
                : "—"
          }
        />
        <MetricPill label="Est. finish" value={finishLabel} />
      </div>

      <RemainingBars data={chartData} />
    </section>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-solid)]/50 px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
        {value}
      </p>
    </div>
  );
}
