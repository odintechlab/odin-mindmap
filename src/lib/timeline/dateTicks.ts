import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import type { LodTier } from "@/types/timelineViewport";

export interface HeaderMajorTick {
  label: string;
  startMs: number;
  endMs: number;
}

export interface HeaderMinorTick {
  label: string;
  ms: number;
}

export interface HeaderTicks {
  major: HeaderMajorTick[];
  minor: HeaderMinorTick[];
}

const WEEK_OPTS = { weekStartsOn: 1 as const };
// Safety backstop against pathological ranges; normal pxPerDay bounds never
// come close to this many iterations.
const MAX_TICKS = 2000;

function walk(rangeStartMs: number, rangeEndMs: number, alignStart: (d: Date) => Date, step: (d: Date) => Date): Date[] {
  const out: Date[] = [];
  let cursor = alignStart(new Date(rangeStartMs));
  let guard = 0;
  while (cursor.getTime() < rangeEndMs && guard < MAX_TICKS) {
    out.push(cursor);
    cursor = step(cursor);
    guard++;
  }
  return out;
}

function minorTicksFor(tier: LodTier, rangeStartMs: number, rangeEndMs: number): HeaderMinorTick[] {
  switch (tier) {
    case "day":
      return walk(rangeStartMs, rangeEndMs, startOfDay, (d) => addDays(d, 1)).map((d) => ({
        ms: d.getTime(),
        label: format(d, "d") === "1" ? format(d, "MMM d") : format(d, "d"),
      }));
    case "week":
      return walk(rangeStartMs, rangeEndMs, (d) => startOfWeek(d, WEEK_OPTS), (d) => addWeeks(d, 1)).map((d) => ({
        ms: d.getTime(),
        label: format(d, "MMM d"),
      }));
    case "biweek":
      return walk(rangeStartMs, rangeEndMs, (d) => startOfWeek(d, WEEK_OPTS), (d) => addWeeks(d, 2)).map((d) => ({
        ms: d.getTime(),
        label: format(d, "MMM d"),
      }));
    case "month":
      return walk(rangeStartMs, rangeEndMs, startOfMonth, (d) => addMonths(d, 1)).map((d) => ({
        ms: d.getTime(),
        label: format(d, "MMM"),
      }));
    case "quarter":
      return walk(rangeStartMs, rangeEndMs, startOfQuarter, (d) => addQuarters(d, 1)).map((d) => ({
        ms: d.getTime(),
        label: format(d, "QQQ"),
      }));
    case "year":
      return walk(rangeStartMs, rangeEndMs, startOfYear, (d) => addYears(d, 1)).map((d) => ({
        ms: d.getTime(),
        label: format(d, "yyyy"),
      }));
  }
}

function majorTicksFor(tier: LodTier, rangeStartMs: number, rangeEndMs: number): HeaderMajorTick[] {
  // At the year tier, minor ticks already show the year — a major band
  // would just duplicate the same label, so skip it.
  if (tier === "year") return [];

  const useYearBands = tier === "month" || tier === "quarter";
  const alignStart = useYearBands ? startOfYear : startOfMonth;
  const step = useYearBands ? (d: Date) => addYears(d, 1) : (d: Date) => addMonths(d, 1);
  const labelFormat = useYearBands ? "yyyy" : "MMMM yyyy";

  const starts = walk(rangeStartMs, rangeEndMs, alignStart, step);
  return starts.map((d, i) => ({
    label: format(d, labelFormat),
    startMs: d.getTime(),
    endMs: (starts[i + 1] ?? step(d)).getTime(),
  }));
}

/**
 * Generates sticky-header tick data for the given LOD tier, over the
 * visible range plus a 50%-of-span overscan on each side so ticks are
 * already in place when the user pans.
 */
export function getHeaderTicks(viewStartMs: number, viewEndMs: number, tier: LodTier): HeaderTicks {
  const span = viewEndMs - viewStartMs;
  const overscan = span * 0.5;
  const rangeStartMs = viewStartMs - overscan;
  const rangeEndMs = viewEndMs + overscan;

  return {
    major: majorTicksFor(tier, rangeStartMs, rangeEndMs),
    minor: minorTicksFor(tier, rangeStartMs, rangeEndMs),
  };
}

/**
 * A single human-readable label describing the currently visible window,
 * shaped to the LOD tier (e.g. "Mar 3 – 9, 2026" while zoomed to days,
 * "March 2026" at month zoom, "2024 – 2026" at year zoom) — this is the
 * primary "what period am I viewing" indicator shown in the toolbar.
 */
export function formatPeriodLabel(viewStartMs: number, viewEndMs: number, tier: LodTier): string {
  const start = new Date(viewStartMs);
  const end = new Date(viewEndMs);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  switch (tier) {
    case "day":
    case "week":
    case "biweek": {
      if (sameMonth) return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
      if (sameYear) return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
      return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
    }
    case "month": {
      if (sameMonth) return format(start, "MMMM yyyy");
      if (sameYear) return `${format(start, "MMM")} – ${format(end, "MMM yyyy")}`;
      return `${format(start, "MMM yyyy")} – ${format(end, "MMM yyyy")}`;
    }
    case "quarter":
      return sameYear ? format(start, "yyyy") : `${format(start, "yyyy")} – ${format(end, "yyyy")}`;
    case "year":
      return `${format(start, "yyyy")} – ${format(end, "yyyy")}`;
  }
}
