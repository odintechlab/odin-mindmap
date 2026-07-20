"use client";

import { useMemo } from "react";
import { clusterVisibleBars } from "@/lib/timeline/clustering";
import { CLUSTER_GAP_PX, MIN_BAR_PX } from "@/lib/timeline/constants";
import { msToPx } from "@/lib/timeline/viewport";
import { TimelineBarCard } from "./TimelineBarCard";
import { TimelineClusterChip } from "./TimelineClusterChip";
import type { TimelineBar } from "@/types/timeline";

type PackedBar = TimelineBar & { lane: number };

interface TimelineRowGroupProps {
  topOffsetPx: number;
  heightPx: number;
  visibleBars: PackedBar[];
  viewStartMs: number;
  pxPerDay: number;
  selectedTaskId: string | number | null;
  onSelectBar: (bar: TimelineBar) => void;
}

/**
 * Renders the lanes/bars for a single rowLabel group. Only the plotting
 * content — the row's label gutter cell lives in a separate DOM column
 * owned by the parent (see TimelineCanvas), since the label column and
 * plotting column are siblings, not nested, in the two-column layout.
 */
export function TimelineRowGroup({
  topOffsetPx,
  heightPx,
  visibleBars,
  viewStartMs,
  pxPerDay,
  selectedTaskId,
  onSelectBar,
}: TimelineRowGroupProps) {
  const lanes = useMemo(() => {
    const byLane = new Map<number, PackedBar[]>();
    for (const bar of visibleBars) {
      const bucket = byLane.get(bar.lane);
      if (bucket) bucket.push(bar);
      else byLane.set(bar.lane, [bar]);
    }
    return byLane;
  }, [visibleBars]);

  return (
    <div className="absolute border-b border-[var(--border)]" style={{ top: topOffsetPx, height: heightPx, left: 0, right: 0 }}>
      {[...lanes.entries()].flatMap(([lane, bars]) => {
        const screenBars = bars.map((bar) => ({
          item: bar,
          x1: msToPx(bar.startMs, viewStartMs, pxPerDay),
          x2: msToPx(bar.endMs, viewStartMs, pxPerDay),
        }));
        const nodes = clusterVisibleBars(screenBars, MIN_BAR_PX, CLUSTER_GAP_PX);

        return nodes.map((node, i) =>
          node.type === "single" ? (
            <TimelineBarCard
              key={node.item.task.id}
              bar={node.item}
              x1={node.x1}
              x2={node.x2}
              lane={lane}
              selected={selectedTaskId === node.item.task.id}
              onSelect={() => onSelectBar(node.item)}
            />
          ) : (
            <TimelineClusterChip
              key={`cluster-${lane}-${i}`}
              x1={node.x1}
              x2={node.x2}
              lane={lane}
              members={node.members}
              onSelectMember={onSelectBar}
            />
          ),
        );
      })}
    </div>
  );
}
