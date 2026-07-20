"use client";

import { useMemo } from "react";
import { getHeaderTicks } from "@/lib/timeline/dateTicks";
import { msToPx } from "@/lib/timeline/viewport";
import { HEADER_MAJOR_HEIGHT, HEADER_MINOR_HEIGHT } from "@/lib/timeline/constants";
import type { LodTier } from "@/types/timelineViewport";

interface TimelineHeaderProps {
  viewStartMs: number;
  viewEndMs: number;
  pxPerDay: number;
  lodTier: LodTier;
}

/**
 * Renders the tick content for the sticky header's plotting cell (the
 * gutter corner and vertical stickiness itself are handled by the parent
 * TimelineCanvas layout). Every tick is individually positioned via
 * `transform: translateX(...)` rather than a shared transform on an
 * ancestor — this keeps this component's own descendants free of any
 * containing-block interference, and lets the browser composite each tick
 * on the GPU instead of triggering layout on every pan/zoom frame.
 */
export function TimelineHeader({ viewStartMs, viewEndMs, pxPerDay, lodTier }: TimelineHeaderProps) {
  const ticks = useMemo(() => getHeaderTicks(viewStartMs, viewEndMs, lodTier), [viewStartMs, viewEndMs, lodTier]);

  return (
    <div className="relative" style={{ height: HEADER_MAJOR_HEIGHT + HEADER_MINOR_HEIGHT }}>
      <div className="relative border-b border-[var(--border)]" style={{ height: HEADER_MAJOR_HEIGHT }}>
        {ticks.major.map((band) => {
          const x1 = msToPx(band.startMs, viewStartMs, pxPerDay);
          const x2 = msToPx(band.endMs, viewStartMs, pxPerDay);
          return (
            <div
              key={band.startMs}
              className="absolute top-0 flex h-full items-center overflow-hidden whitespace-nowrap border-r border-[var(--border)] pl-2 text-xs font-bold text-zinc-700 dark:text-zinc-200"
              style={{ left: 0, width: Math.max(x2 - x1, 0), transform: `translateX(${x1}px)` }}
            >
              {band.label}
            </div>
          );
        })}
      </div>
      <div className="relative" style={{ height: HEADER_MINOR_HEIGHT }}>
        {ticks.minor.map((tick) => (
          <div
            key={tick.ms}
            className="absolute top-0 flex h-full items-center whitespace-nowrap pl-1.5 text-[10px] font-medium text-[var(--muted)]"
            style={{ left: 0, transform: `translateX(${msToPx(tick.ms, viewStartMs, pxPerDay)}px)` }}
          >
            {tick.label}
          </div>
        ))}
      </div>
    </div>
  );
}
