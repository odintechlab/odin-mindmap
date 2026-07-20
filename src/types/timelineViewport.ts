export type TimelineZoomPreset = "day" | "week" | "month" | "quarter" | "year";

export type LodTier = "day" | "week" | "biweek" | "month" | "quarter" | "year";

export interface TimelineViewport {
  viewStartMs: number;
  pxPerDay: number;
}
