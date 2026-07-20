"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LodTier, TimelineViewport, TimelineZoomPreset } from "@/types/timelineViewport";
import {
  DAY_MS,
  MAX_PXPERDAY,
  MIN_PXPERDAY,
  TWEEN_DURATION_MS,
  WHEEL_ZOOM_SENSITIVITY,
} from "@/lib/timeline/constants";
import { animate } from "@/lib/timeline/tween";
import { clamp, getLodTier, presetToPxPerDay, zoomAtPoint } from "@/lib/timeline/viewport";

interface UseTimelineViewportOptions {
  initialViewStartMs: number;
  initialPxPerDay: number;
}

export interface TimelineViewportApi {
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerWidthPx: number;
  viewStartMs: number;
  viewEndMs: number;
  pxPerDay: number;
  lodTier: LodTier;
  activePreset: TimelineZoomPreset | null;
  isPanning: boolean;
  setPreset: (preset: TimelineZoomPreset) => void;
  zoomBy: (factor: number) => void;
  panTo: (viewStartMs: number) => void;
  goToToday: () => void;
  goToPrev: () => void;
  goToNext: () => void;
}

/**
 * Owns the timeline's viewport state (visible window + zoom scale) and
 * wires up all pan/zoom gesture handling: mouse wheel, ctrl+wheel /
 * trackpad-pinch-as-wheel, real two-finger touch pinch, and pointer
 * drag-to-pan. Knows nothing about bars/rendering — pure viewport math +
 * DOM event wiring, independent of the data being displayed.
 */
export function useTimelineViewport({
  initialViewStartMs,
  initialPxPerDay,
}: UseTimelineViewportOptions): TimelineViewportApi {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidthPx, setContainerWidthPx] = useState(0);
  const [viewport, setViewport] = useState<TimelineViewport>({
    viewStartMs: initialViewStartMs,
    pxPerDay: initialPxPerDay,
  });
  const [activePreset, setActivePreset] = useState<TimelineZoomPreset | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const cancelTweenRef = useRef<(() => void) | null>(null);
  const cancelTween = useCallback(() => {
    cancelTweenRef.current?.();
    cancelTweenRef.current = null;
  }, []);

  // Any direct/gesture-driven viewport change preempts an in-flight tween
  // and clears the "active preset" pill (manual input no longer matches it).
  const applyImmediate = useCallback(
    (next: TimelineViewport) => {
      cancelTween();
      setActivePreset(null);
      setViewport(next);
    },
    [cancelTween],
  );

  const animateTo = useCallback(
    (to: TimelineViewport, preset: TimelineZoomPreset | null = null) => {
      cancelTween();
      const from = viewportRef.current;
      cancelTweenRef.current = animate({
        from,
        to,
        durationMs: TWEEN_DURATION_MS,
        onFrame: (v) => setViewport(v),
        onDone: () => {
          cancelTweenRef.current = null;
          setActivePreset(preset);
        },
      });
    },
    [cancelTween],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidthPx(width);
    });
    observer.observe(el);
    setContainerWidthPx(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Manual non-passive wheel listener: React's synthetic onWheel is passive
  // under the hood, so preventDefault() there won't reliably block the
  // browser's native ctrl+wheel page-zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      const rect = el!.getBoundingClientRect();
      const anchorPx = e.clientX - rect.left;

      if (e.ctrlKey) {
        // Trackpad pinch surfaces as wheel+ctrlKey in all major browsers.
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY);
        applyImmediate(zoomAtPoint(viewportRef.current, anchorPx, factor, MIN_PXPERDAY, MAX_PXPERDAY));
        return;
      }

      // Shift+wheel is a common convention for horizontal scroll from a
      // plain vertical mouse wheel; some browsers already remap it to
      // deltaX, others don't, so handle both.
      const deltaX = e.shiftKey && Math.abs(e.deltaX) < Math.abs(e.deltaY) ? e.deltaY : e.deltaX;
      const isHorizontal = e.shiftKey || Math.abs(deltaX) > Math.abs(e.deltaY);

      if (isHorizontal && deltaX !== 0) {
        e.preventDefault();
        const current = viewportRef.current;
        applyImmediate({
          ...current,
          viewStartMs: current.viewStartMs + (deltaX / current.pxPerDay) * DAY_MS,
        });
      }
      // Otherwise: dominant vertical wheel with no modifier — leave it
      // alone so native vertical row-scrolling keeps working.
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [applyImmediate]);

  // Pointer handling: single-pointer drag-to-pan, two-pointer pinch-zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let dragStart: { x: number; viewStartMs: number } | null = null;
    let pinchStartDist: number | null = null;
    let pinchStartViewport: TimelineViewport | null = null;

    function midpointX() {
      const pts = [...pointers.values()];
      return (pts[0].x + pts[1].x) / 2;
    }
    function distance() {
      const pts = [...pointers.values()];
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }

    function handlePointerDown(e: PointerEvent) {
      // Only drag-pan from empty canvas background — bars/buttons opt out
      // via data-timeline-interactive so their own click handlers still fire.
      const target = e.target as HTMLElement;
      if (target.closest("[data-timeline-interactive]")) return;

      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el!.setPointerCapture(e.pointerId);

      if (pointers.size === 1) {
        cancelTween();
        setIsPanning(true);
        dragStart = { x: e.clientX, viewStartMs: viewportRef.current.viewStartMs };
      } else if (pointers.size === 2) {
        dragStart = null;
        pinchStartDist = distance();
        pinchStartViewport = viewportRef.current;
      }
    }

    function handlePointerMove(e: PointerEvent) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2 && pinchStartDist && pinchStartViewport) {
        const rect = el!.getBoundingClientRect();
        const factor = distance() / pinchStartDist;
        setViewport(
          zoomAtPoint(pinchStartViewport, midpointX() - rect.left, factor, MIN_PXPERDAY, MAX_PXPERDAY),
        );
        setActivePreset(null);
        return;
      }

      if (pointers.size === 1 && dragStart) {
        const deltaPx = e.clientX - dragStart.x;
        const current = viewportRef.current;
        setViewport({
          ...current,
          viewStartMs: dragStart.viewStartMs - (deltaPx / current.pxPerDay) * DAY_MS,
        });
        setActivePreset(null);
      }
    }

    function handlePointerUp(e: PointerEvent) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) {
        pinchStartDist = null;
        pinchStartViewport = null;
      }
      if (pointers.size === 0) {
        dragStart = null;
        setIsPanning(false);
      }
    }

    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerup", handlePointerUp);
    el.addEventListener("pointercancel", handlePointerUp);
    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerup", handlePointerUp);
      el.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [cancelTween]);

  const setPreset = useCallback(
    (preset: TimelineZoomPreset) => {
      if (containerWidthPx <= 0) return;
      const current = viewportRef.current;
      const centerMs = current.viewStartMs + (containerWidthPx / current.pxPerDay / 2) * DAY_MS;
      const newPxPerDay = clamp(presetToPxPerDay(preset, containerWidthPx), MIN_PXPERDAY, MAX_PXPERDAY);
      const newViewStartMs = centerMs - (containerWidthPx / newPxPerDay / 2) * DAY_MS;
      animateTo({ viewStartMs: newViewStartMs, pxPerDay: newPxPerDay }, preset);
    },
    [containerWidthPx, animateTo],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      if (containerWidthPx <= 0) return;
      animateTo(zoomAtPoint(viewportRef.current, containerWidthPx / 2, factor, MIN_PXPERDAY, MAX_PXPERDAY));
    },
    [containerWidthPx, animateTo],
  );

  const panTo = useCallback(
    (viewStartMs: number) => {
      applyImmediate({ ...viewportRef.current, viewStartMs });
    },
    [applyImmediate],
  );

  const goToToday = useCallback(() => {
    if (containerWidthPx <= 0) return;
    const current = viewportRef.current;
    const newViewStartMs = Date.now() - (containerWidthPx / current.pxPerDay / 2) * DAY_MS;
    animateTo({ viewStartMs: newViewStartMs, pxPerDay: current.pxPerDay });
  }, [containerWidthPx, animateTo]);

  const shiftByPeriod = useCallback(
    (direction: 1 | -1) => {
      if (containerWidthPx <= 0) return;
      const current = viewportRef.current;
      const visibleDays = containerWidthPx / current.pxPerDay;
      animateTo({ ...current, viewStartMs: current.viewStartMs + direction * visibleDays * DAY_MS });
    },
    [containerWidthPx, animateTo],
  );
  const goToPrev = useCallback(() => shiftByPeriod(-1), [shiftByPeriod]);
  const goToNext = useCallback(() => shiftByPeriod(1), [shiftByPeriod]);

  const viewEndMs = useMemo(
    () => viewport.viewStartMs + (containerWidthPx / viewport.pxPerDay) * DAY_MS,
    [viewport, containerWidthPx],
  );
  const lodTier = useMemo(() => getLodTier(viewport.pxPerDay), [viewport.pxPerDay]);

  return {
    containerRef,
    containerWidthPx,
    viewStartMs: viewport.viewStartMs,
    viewEndMs,
    pxPerDay: viewport.pxPerDay,
    lodTier,
    activePreset,
    isPanning,
    setPreset,
    zoomBy,
    panTo,
    goToToday,
    goToPrev,
    goToNext,
  };
}
