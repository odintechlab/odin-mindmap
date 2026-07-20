import type { TimelineViewport } from "@/types/timelineViewport";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface AnimateOptions {
  from: TimelineViewport;
  to: TimelineViewport;
  durationMs: number;
  onFrame: (viewport: TimelineViewport) => void;
  onDone?: () => void;
}

/**
 * Animates between two viewports, interpolating pxPerDay in log-space
 * (zoom is multiplicative, so linear interpolation of pxPerDay itself
 * feels uneven) and viewStartMs linearly. Returns a cancel function —
 * callers must invoke it the instant a new user gesture starts so manual
 * input always preempts an in-flight animation.
 */
export function animate(options: AnimateOptions): () => void {
  const { from, to, durationMs, onFrame, onDone } = options;
  let cancelled = false;
  const startTime = performance.now();
  const logFrom = Math.log(from.pxPerDay);
  const logTo = Math.log(to.pxPerDay);

  function frame(now: number) {
    if (cancelled) return;
    const t = durationMs <= 0 ? 1 : clamp01((now - startTime) / durationMs);
    const eased = easeOutCubic(t);
    onFrame({
      viewStartMs: lerp(from.viewStartMs, to.viewStartMs, eased),
      pxPerDay: Math.exp(lerp(logFrom, logTo, eased)),
    });
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      onDone?.();
    }
  }

  requestAnimationFrame(frame);

  return () => {
    cancelled = true;
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
