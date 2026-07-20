import type { TimelineZoomPreset } from "@/types/timelineViewport";

export const DAY_MS = 86_400_000;

export const ROW_HEIGHT = 32;
export const LANE_GAP_PX = 4;
export const LABEL_GUTTER_WIDTH = 180;
export const HEADER_MAJOR_HEIGHT = 28;
export const HEADER_MINOR_HEIGHT = 24;
export const MINIMAP_HEIGHT = 40;

export const MIN_BAR_PX = 7;
export const CLUSTER_GAP_PX = 4;

export const MIN_PXPERDAY = 0.08;
export const MAX_PXPERDAY = 400;

export const PRESET_VISIBLE_DAYS: Record<TimelineZoomPreset, number> = {
  day: 3,
  week: 10,
  month: 35,
  quarter: 100,
  year: 400,
};

// pxPerDay thresholds for level-of-detail tier selection (upper bound exclusive).
export const LOD_THRESHOLDS = {
  day: 80,
  week: 20,
  biweek: 4,
  month: 1,
  quarter: 0.3,
} as const;

export const TWEEN_DURATION_MS = 320;

// Fraction of the viewport width rendered beyond each edge, so bars are
// already mounted before they scroll into strict view (avoids pop-in jank).
export const OVERSCAN_RATIO = 0.75;

// Visible-window recompute is quantized to this fraction of the viewport
// width so panning doesn't re-run the visible-bars memo every animation frame.
export const VISIBLE_WINDOW_QUANTIZE_RATIO = 0.1;

export const ZOOM_BUTTON_FACTOR = 1.4;
// Applied as exp(-deltaY * SENSITIVITY) to ctrl+wheel / trackpad-pinch-as-wheel events.
export const WHEEL_ZOOM_SENSITIVITY = 0.01;
// Used to seed pxPerDay before the container's real width is known via ResizeObserver.
export const FALLBACK_CONTAINER_WIDTH = 900;
