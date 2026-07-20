import type { LodTier, TimelineViewport, TimelineZoomPreset } from "@/types/timelineViewport";
import { DAY_MS, LOD_THRESHOLDS, PRESET_VISIBLE_DAYS } from "./constants";

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function msToPx(ms: number, viewStartMs: number, pxPerDay: number): number {
  return ((ms - viewStartMs) / DAY_MS) * pxPerDay;
}

export function pxToMs(px: number, viewStartMs: number, pxPerDay: number): number {
  return viewStartMs + (px / pxPerDay) * DAY_MS;
}

/**
 * Zoom in/out anchored at a screen-space point (e.g. cursor or pinch
 * midpoint), so the timestamp under that point stays fixed on screen.
 */
export function zoomAtPoint(
  viewport: TimelineViewport,
  anchorPx: number,
  factor: number,
  minPxPerDay: number,
  maxPxPerDay: number,
): TimelineViewport {
  const msUnderAnchor = pxToMs(anchorPx, viewport.viewStartMs, viewport.pxPerDay);
  const newPxPerDay = clamp(viewport.pxPerDay * factor, minPxPerDay, maxPxPerDay);
  const newViewStartMs = msUnderAnchor - (anchorPx / newPxPerDay) * DAY_MS;
  return { viewStartMs: newViewStartMs, pxPerDay: newPxPerDay };
}

export function presetToPxPerDay(preset: TimelineZoomPreset, containerWidthPx: number): number {
  return containerWidthPx / PRESET_VISIBLE_DAYS[preset];
}

export function getLodTier(pxPerDay: number): LodTier {
  if (pxPerDay >= LOD_THRESHOLDS.day) return "day";
  if (pxPerDay >= LOD_THRESHOLDS.week) return "week";
  if (pxPerDay >= LOD_THRESHOLDS.biweek) return "biweek";
  if (pxPerDay >= LOD_THRESHOLDS.month) return "month";
  if (pxPerDay >= LOD_THRESHOLDS.quarter) return "quarter";
  return "year";
}
