"use client";

import { useRef, useState } from "react";
import { MINIMAP_HEIGHT } from "@/lib/timeline/constants";
import type { TimelineBar } from "@/types/timeline";

interface TimelineMinimapProps {
  bars: TimelineBar[];
  extentStartMs: number;
  extentEndMs: number;
  viewStartMs: number;
  viewEndMs: number;
  onPan: (viewStartMs: number) => void;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Compact density strip spanning the full data extent (auto-grown to
 * include wherever the user has panned, rather than clamping pan to the
 * data — see plan notes), with a draggable rectangle showing the current
 * viewport. Dragging pans directly (no easing — this is direct
 * manipulation, distinct from the toolbar's animated transitions).
 */
export function TimelineMinimap({ bars, extentStartMs, extentEndMs, viewStartMs, viewEndMs, onPan }: TimelineMinimapProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{ startClientX: number; startViewStartMs: number } | null>(null);

  const span = Math.max(extentEndMs - extentStartMs, 1);
  const toPct = (ms: number) => clamp01((ms - extentStartMs) / span) * 100;

  const viewLeftPct = toPct(viewStartMs);
  const viewWidthPct = Math.max(toPct(viewEndMs) - viewLeftPct, 0.5);
  const viewWidthMs = viewEndMs - viewStartMs;

  function msPerPx(): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return span / rect.width;
  }

  function handleViewportPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({ startClientX: e.clientX, startViewStartMs: viewStartMs });
  }

  function handleViewportPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) return;
    const deltaPx = e.clientX - dragState.startClientX;
    onPan(dragState.startViewStartMs + deltaPx * msPerPx());
  }

  function handleViewportPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    setDragState(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-minimap-viewport]")) return;
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickPct = clamp01((e.clientX - rect.left) / rect.width);
    const clickMs = extentStartMs + clickPct * span;
    onPan(clickMs - viewWidthMs / 2);
  }

  return (
    <div className="border-t border-[var(--border)] px-4 py-2">
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="glass-inset relative cursor-pointer overflow-hidden rounded-lg border border-[var(--border)]"
        style={{ height: MINIMAP_HEIGHT }}
      >
        {bars.map((bar) => {
          const left = toPct(bar.startMs);
          const width = Math.max(toPct(bar.endMs) - left, 0.3);
          return (
            <div
              key={bar.task.id}
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: bar.task.status.color || "#818cf8",
                opacity: 0.6,
              }}
            />
          );
        })}

        <div
          data-minimap-viewport
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerUp}
          onPointerCancel={handleViewportPointerUp}
          className="absolute top-0 h-full cursor-grab rounded-md border-2 border-indigo-500/80 bg-indigo-500/10 active:cursor-grabbing dark:border-indigo-400/80"
          style={{ left: `${viewLeftPct}%`, width: `${viewWidthPct}%` }}
        />
      </div>
    </div>
  );
}
