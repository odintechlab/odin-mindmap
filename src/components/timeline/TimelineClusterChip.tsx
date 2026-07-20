"use client";

import { useEffect, useRef, useState } from "react";
import { LANE_GAP_PX, ROW_HEIGHT } from "@/lib/timeline/constants";
import type { TimelineBar } from "@/types/timeline";

interface TimelineClusterChipProps {
  x1: number;
  x2: number;
  lane: number;
  members: TimelineBar[];
  onSelectMember: (bar: TimelineBar) => void;
}

/**
 * The "+N" overflow affordance for zoomed-out density (see clustering.ts).
 * The popover uses `position: fixed` computed from the trigger's bounding
 * rect rather than an absolutely-positioned descendant, since the
 * plotting area it lives in clips overflow to cull off-screen bars.
 */
export function TimelineClusterChip({ x1, x2, lane, members, onSelectMember }: TimelineClusterChipProps) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const width = Math.max(x2 - x1, 1);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-timeline-interactive
        onClick={toggleOpen}
        title={`${members.length} tasks`}
        className="absolute flex items-center justify-center rounded-md bg-zinc-500/90 text-[10px] font-bold text-white shadow-sm transition-transform duration-150 ease-out hover:z-10 hover:scale-[1.05] dark:bg-zinc-400/90 dark:text-zinc-900"
        style={{
          top: lane * ROW_HEIGHT + LANE_GAP_PX / 2,
          height: ROW_HEIGHT - LANE_GAP_PX,
          width,
          left: 0,
          transform: `translateX(${x1}px)`,
        }}
      >
        +{members.length}
      </button>

      {open && popoverPos && (
        <div
          ref={popoverRef}
          data-timeline-interactive
          className="glass-solid fixed z-50 max-h-64 w-64 overflow-y-auto rounded-xl border border-[var(--border-strong)] p-1 shadow-surface-lg"
          style={{ top: popoverPos.top, left: popoverPos.left }}
        >
          {members.map((bar) => (
            <button
              key={bar.task.id}
              type="button"
              onClick={() => {
                onSelectMember(bar);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-zinc-700 transition-colors hover:bg-black/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.06]"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: bar.task.status.color || "#818cf8" }}
              />
              <span className="truncate">{bar.task.name}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
