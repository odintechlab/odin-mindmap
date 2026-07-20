"use client";

import { useMemo } from "react";
import { getHeaderTicks } from "@/lib/timeline/dateTicks";
import { msToPx } from "@/lib/timeline/viewport";
import { DAY_MS } from "@/lib/timeline/constants";
import type { LodTier } from "@/types/timelineViewport";

interface TimelineGridProps {
  viewStartMs: number;
  viewEndMs: number;
  pxPerDay: number;
  lodTier: LodTier;
  heightPx: number;
}

function* weekendSpans(viewStartMs: number, viewEndMs: number) {
  const overscanMs = (viewEndMs - viewStartMs) * 0.5;
  const cursorStart = new Date(viewStartMs - overscanMs);
  cursorStart.setHours(0, 0, 0, 0);
  let cursorMs = cursorStart.getTime();
  const endMs = viewEndMs + overscanMs;
  let guard = 0;
  while (cursorMs < endMs && guard < 3000) {
    const day = new Date(cursorMs).getDay();
    if (day === 0 || day === 6) {
      yield { startMs: cursorMs, endMs: cursorMs + DAY_MS };
    }
    cursorMs += DAY_MS;
    guard++;
  }
}

/**
 * Background gridlines, weekend shading, and the "Today" marker — rendered
 * as absolutely-positioned divs in the same coordinate space as the event
 * bars (not SVG), so grid and bars stay pixel-consistent under one
 * time->pixel mapping instead of two separately-implemented systems.
 */
export function TimelineGrid({ viewStartMs, viewEndMs, pxPerDay, lodTier, heightPx }: TimelineGridProps) {
  const ticks = useMemo(() => getHeaderTicks(viewStartMs, viewEndMs, lodTier), [viewStartMs, viewEndMs, lodTier]);
  const showWeekends = lodTier === "day" || lodTier === "week";
  const weekends = useMemo(
    () => (showWeekends ? [...weekendSpans(viewStartMs, viewEndMs)] : []),
    [showWeekends, viewStartMs, viewEndMs],
  );

  const now = Date.now();
  const todayOverscanMs = (viewEndMs - viewStartMs) * 0.1;
  const showToday = now >= viewStartMs - todayOverscanMs && now <= viewEndMs + todayOverscanMs;
  const todayX = showToday ? msToPx(now, viewStartMs, pxPerDay) : null;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ height: heightPx }}>
      {weekends.map((span) => {
        const x1 = msToPx(span.startMs, viewStartMs, pxPerDay);
        const x2 = msToPx(span.endMs, viewStartMs, pxPerDay);
        return (
          <div
            key={span.startMs}
            className="absolute top-0 bg-zinc-500/[0.04] dark:bg-zinc-300/[0.04]"
            style={{ left: 0, width: Math.max(x2 - x1, 0), height: heightPx, transform: `translateX(${x1}px)` }}
          />
        );
      })}

      {ticks.minor.map((tick) => (
        <div
          key={tick.ms}
          className="absolute top-0 border-l border-[var(--border)]/60"
          style={{ left: 0, height: heightPx, transform: `translateX(${msToPx(tick.ms, viewStartMs, pxPerDay)}px)` }}
        />
      ))}

      {todayX !== null && (
        <div
          className="absolute top-0 z-10 border-l-[1.5px] border-dashed border-orange-500 dark:border-orange-400"
          style={{ left: 0, height: heightPx, transform: `translateX(${todayX}px)` }}
        >
          <span className="absolute left-1 top-0 whitespace-nowrap rounded-b px-1 py-0.5 text-[9px] font-bold text-white shadow-sm" style={{ backgroundColor: "#f97316" }}>
            Today
          </span>
        </div>
      )}
    </div>
  );
}
