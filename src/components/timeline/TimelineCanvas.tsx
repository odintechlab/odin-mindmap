"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTimelineViewport } from "@/hooks/useTimelineViewport";
import { formatPeriodLabel } from "@/lib/timeline/dateTicks";
import { laneCount, packLanesByGroup } from "@/lib/timeline/lanePacking";
import {
  DAY_MS,
  FALLBACK_CONTAINER_WIDTH,
  LABEL_GUTTER_WIDTH,
  OVERSCAN_RATIO,
  PRESET_VISIBLE_DAYS,
  ROW_HEIGHT,
  ZOOM_BUTTON_FACTOR,
} from "@/lib/timeline/constants";
import { clamp, presetToPxPerDay } from "@/lib/timeline/viewport";
import { TimelineDetailPanel } from "./TimelineDetailPanel";
import { TimelineGrid } from "./TimelineGrid";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineMinimap } from "./TimelineMinimap";
import { TimelineRowGroup } from "./TimelineRowGroup";
import { TimelineToolbar } from "./TimelineToolbar";
import type { TimelineBar, TimelineStats } from "@/types/timeline";

type PackedBar = TimelineBar & { lane: number };

interface TimelineCanvasProps {
  stats: TimelineStats;
}

export function TimelineCanvas({ stats }: TimelineCanvasProps) {
  const [selected, setSelected] = useState<TimelineBar | null>(null);

  // The shared tab-page chrome sizes its content area via `min-height`
  // rather than `height`, which (per the flexbox spec's definite-size
  // rules) makes percentage heights like `h-full` fail to resolve for
  // deeply-nested flex descendants — this component's height would
  // silently collapse to its content size instead of filling the page.
  // Measuring and setting an explicit pixel height sidesteps that
  // entirely without touching the shared layout used by other tabs.
  const rootRef = useRef<HTMLDivElement>(null);
  const [fillHeightPx, setFillHeightPx] = useState<number | null>(null);
  useLayoutEffect(() => {
    function recompute() {
      if (!rootRef.current) return;
      const top = rootRef.current.getBoundingClientRect().top;
      setFillHeightPx(Math.max(window.innerHeight - top, 0));
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  const initialPxPerDay = useMemo(() => presetToPxPerDay("month", FALLBACK_CONTAINER_WIDTH), []);
  // Seeded once on mount from the data extent, and deliberately not
  // re-derived from `stats` on later filter changes, so the user's current
  // pan/zoom position survives filter/groupBy changes.
  const [initialViewStartMs] = useState(() => {
    const centerMs = clamp(Date.now(), stats.rangeStart, stats.rangeEnd);
    return centerMs - (PRESET_VISIBLE_DAYS.month / 2) * DAY_MS;
  });

  const viewport = useTimelineViewport({ initialViewStartMs, initialPxPerDay });

  const packedByGroup = useMemo(
    () => packLanesByGroup(stats.bars, (bar) => bar.rowLabel),
    [stats.bars],
  );

  const rowLabels = useMemo(
    () => [...packedByGroup.keys()].sort((a, b) => a.localeCompare(b)),
    [packedByGroup],
  );

  const rowLayout = useMemo(() => {
    let offset = 0;
    return rowLabels.map((label) => {
      const bars = packedByGroup.get(label) ?? [];
      const height = Math.max(laneCount(bars), 1) * ROW_HEIGHT;
      const top = offset;
      offset += height;
      return { label, top, height };
    });
  }, [rowLabels, packedByGroup]);

  const totalBodyHeight = rowLayout.length
    ? rowLayout[rowLayout.length - 1].top + rowLayout[rowLayout.length - 1].height
    : 0;

  const visibleBarsByGroup = useMemo(() => {
    const overscanMs = (viewport.viewEndMs - viewport.viewStartMs) * OVERSCAN_RATIO;
    const lo = viewport.viewStartMs - overscanMs;
    const hi = viewport.viewEndMs + overscanMs;
    const result = new Map<string, PackedBar[]>();
    for (const [label, bars] of packedByGroup) {
      result.set(
        label,
        bars.filter((b) => b.endMs >= lo && b.startMs <= hi),
      );
    }
    return result;
  }, [packedByGroup, viewport.viewStartMs, viewport.viewEndMs]);

  const dataExtentStart = Math.min(stats.rangeStart, viewport.viewStartMs);
  const dataExtentEnd = Math.max(stats.rangeEnd, viewport.viewEndMs);

  const periodLabel = formatPeriodLabel(viewport.viewStartMs, viewport.viewEndMs, viewport.lodTier);
  const subtitle = `${stats.bars.length} task${stats.bars.length === 1 ? "" : "s"} · grouped by ${stats.groupBy}`;

  if (stats.bars.length === 0) {
    return (
      <div
        ref={rootRef}
        className="flex flex-col items-center justify-center p-6"
        style={{ height: fillHeightPx ?? undefined }}
      >
        <div className="glass-strong max-w-md rounded-2xl border border-[var(--border)] p-8 text-center shadow-surface">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">No tasks with start or due dates</p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Add start_date or due_date on tasks in ClickUp to see them on the timeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="flex min-h-0" style={{ height: fillHeightPx ?? undefined }}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TimelineToolbar
          periodLabel={periodLabel}
          subtitle={subtitle}
          activePreset={viewport.activePreset}
          onPreset={viewport.setPreset}
          onZoomIn={() => viewport.zoomBy(ZOOM_BUTTON_FACTOR)}
          onZoomOut={() => viewport.zoomBy(1 / ZOOM_BUTTON_FACTOR)}
          onPrev={viewport.goToPrev}
          onNext={viewport.goToNext}
          onToday={viewport.goToToday}
        />

        <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="glass-solid sticky top-0 z-20 flex border-b border-[var(--border-strong)]">
            <div className="shrink-0 border-r border-[var(--border)]" style={{ width: LABEL_GUTTER_WIDTH }} />
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <TimelineHeader
                viewStartMs={viewport.viewStartMs}
                viewEndMs={viewport.viewEndMs}
                pxPerDay={viewport.pxPerDay}
                lodTier={viewport.lodTier}
              />
            </div>
          </div>

          <div className="relative flex" style={{ minHeight: totalBodyHeight }}>
            <div
              className="relative shrink-0 border-r border-[var(--border)]"
              style={{ width: LABEL_GUTTER_WIDTH, height: totalBodyHeight }}
            >
              {rowLayout.map(({ label, top, height }) => (
                <div
                  key={label}
                  className="glass-solid absolute flex items-center border-b border-[var(--border)] px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-200"
                  style={{ top, height, left: 0, right: 0 }}
                  title={label}
                >
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>

            <div
              ref={viewport.containerRef}
              className={`relative min-w-0 flex-1 overflow-hidden ${viewport.isPanning ? "cursor-grabbing" : "cursor-grab"}`}
              style={{ height: totalBodyHeight, touchAction: "pan-y" }}
            >
              <TimelineGrid
                viewStartMs={viewport.viewStartMs}
                viewEndMs={viewport.viewEndMs}
                pxPerDay={viewport.pxPerDay}
                lodTier={viewport.lodTier}
                heightPx={totalBodyHeight}
              />
              {rowLayout.map(({ label, top, height }) => (
                <TimelineRowGroup
                  key={label}
                  topOffsetPx={top}
                  heightPx={height}
                  visibleBars={visibleBarsByGroup.get(label) ?? []}
                  viewStartMs={viewport.viewStartMs}
                  pxPerDay={viewport.pxPerDay}
                  selectedTaskId={selected?.task.id ?? null}
                  onSelectBar={setSelected}
                />
              ))}
            </div>
          </div>
        </div>

        <TimelineMinimap
          bars={stats.bars}
          extentStartMs={dataExtentStart}
          extentEndMs={dataExtentEnd}
          viewStartMs={viewport.viewStartMs}
          viewEndMs={viewport.viewEndMs}
          onPan={viewport.panTo}
        />
      </div>

      <TimelineDetailPanel bar={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
