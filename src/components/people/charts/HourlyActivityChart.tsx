"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useI18n } from "@/components/i18n/LocaleProvider";
import {
  formatHourRange,
  seriesHasChartData,
} from "@/lib/people/metrics";
import type { MessageKey } from "@/lib/i18n/messages";
import type { PeopleHourlyPoint } from "@/types/people";
import { ChartCard } from "./ChartCard";
import { cn } from "@/lib/utils";

interface HourlyActivityChartProps {
  data: PeopleHourlyPoint[];
  titleKey?: MessageKey;
  sublabelKey?: MessageKey;
  /** `card` for performance page; `inset` nests inside another section. */
  variant?: "card" | "inset";
  peakHour?: number | null;
}

export function HourlyActivityChart({
  data,
  titleKey = "charts.hourlyActivity",
  sublabelKey = "charts.hourlyActivitySub",
  variant = "card",
  peakHour = null,
}: HourlyActivityChartProps) {
  const { t } = useI18n();
  const empty = !seriesHasChartData(data);
  const chartData = data.map((d) => ({
    ...d,
    label: String(d.hour).padStart(2, "0"),
    range: formatHourRange(d.hour),
  }));
  const chartConfig = {
    count: {
      label: t("charts.unitTouches"),
      color: "var(--accent)",
    },
    overtime: {
      label: t("charts.overtimeHour"),
      color: "var(--chart-5)",
    },
  } satisfies ChartConfig;

  const chart = empty ? (
    <p className="text-sm text-[var(--muted)]">{t("charts.notEnough")}</p>
  ) : (
    <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
      <BarChart
        accessibilityLayer
        data={chartData}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={10}
          interval={1}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={28}
          fontSize={11}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as
                  | { range?: string }
                  | undefined;
                return row?.range ?? "";
              }}
            />
          }
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={400}>
          {chartData.map((entry) => (
            <Cell
              key={entry.hour}
              fill={
                entry.core ? "var(--color-count)" : "var(--color-overtime)"
              }
              fillOpacity={entry.core ? 1 : 0.7}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );

  const peakLabel =
    peakHour !== null
      ? t("charts.peakHour", { range: formatHourRange(peakHour) })
      : null;

  if (variant === "inset") {
    return (
      <div className="mt-4 glass-inset rounded-xl border border-[var(--border-strong)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          {t(titleKey)}
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--muted)]">{t(sublabelKey)}</p>
        {peakLabel ? (
          <p className="mt-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {peakLabel}
          </p>
        ) : null}
        <div className={cn("mt-3 w-full", empty ? "min-h-0" : "h-[220px]")}>
          {chart}
        </div>
      </div>
    );
  }

  return (
    <ChartCard
      title={t(titleKey)}
      sublabel={
        peakLabel ? `${t(sublabelKey)} ${peakLabel}` : t(sublabelKey)
      }
      empty={empty}
      tall
    >
      <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
        <BarChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={10}
            interval={1}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={28}
            fontSize={11}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as
                    | { range?: string }
                    | undefined;
                  return row?.range ?? "";
                }}
              />
            }
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={400}>
            {chartData.map((entry) => (
              <Cell
                key={entry.hour}
                fill={
                  entry.core ? "var(--color-count)" : "var(--color-overtime)"
                }
                fillOpacity={entry.core ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
