"use client";

import { LANE_GAP_PX, ROW_HEIGHT } from "@/lib/timeline/constants";
import type { TimelineBar } from "@/types/timeline";

interface TimelineBarCardProps {
  bar: TimelineBar;
  x1: number;
  x2: number;
  lane: number;
  selected: boolean;
  onSelect: () => void;
}

/**
 * A single event card. Positioned absolutely by screen px (computed by the
 * caller via msToPx) rather than one of a handful of discrete SVG widths —
 * width now varies continuously with zoom, so plain `text-overflow:
 * ellipsis` replaces the old manual character-slicing.
 */
export function TimelineBarCard({ bar, x1, x2, lane, selected, onSelect }: TimelineBarCardProps) {
  const width = Math.max(x2 - x1, 1);
  const color = bar.task.status.color || "#818cf8";
  const showLabel = width >= 36;

  return (
    <button
      type="button"
      data-timeline-interactive
      onClick={onSelect}
      title={bar.task.name}
      className={`absolute flex items-center overflow-hidden rounded-md px-1.5 text-left text-[11px] font-semibold text-white shadow-sm transition-[transform,box-shadow,opacity] duration-150 ease-out hover:z-10 hover:scale-[1.03] hover:shadow-md focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 ${
        selected ? "z-10 ring-2 ring-white ring-offset-1 ring-offset-transparent" : ""
      }`}
      style={{
        top: lane * ROW_HEIGHT + LANE_GAP_PX / 2,
        height: ROW_HEIGHT - LANE_GAP_PX,
        width,
        left: 0,
        transform: `translateX(${x1}px)`,
        backgroundColor: color,
        opacity: selected ? 1 : 0.88,
      }}
    >
      {showLabel && <span className="truncate">{bar.task.name}</span>}
    </button>
  );
}
