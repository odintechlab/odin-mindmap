import { describe, expect, it } from "vitest";
import { DAY_MS } from "./constants";
import { clamp, getLodTier, msToPx, presetToPxPerDay, pxToMs, zoomAtPoint } from "./viewport";

describe("msToPx / pxToMs", () => {
  it("round-trips a timestamp through px and back", () => {
    const viewStartMs = 1_700_000_000_000;
    const pxPerDay = 40;
    const ms = viewStartMs + 2.5 * DAY_MS;
    const px = msToPx(ms, viewStartMs, pxPerDay);
    expect(px).toBeCloseTo(100, 5);
    expect(pxToMs(px, viewStartMs, pxPerDay)).toBeCloseTo(ms, 5);
  });

  it("maps the view start to pixel 0", () => {
    expect(msToPx(1000, 1000, 50)).toBe(0);
  });
});

describe("zoomAtPoint", () => {
  it("keeps the timestamp under the anchor fixed on screen", () => {
    const viewport = { viewStartMs: 1_700_000_000_000, pxPerDay: 40 };
    const anchorPx = 250;
    const msUnderAnchorBefore = pxToMs(anchorPx, viewport.viewStartMs, viewport.pxPerDay);

    const next = zoomAtPoint(viewport, anchorPx, 2, 0.1, 400);

    expect(next.pxPerDay).toBeCloseTo(80, 5);
    const msUnderAnchorAfter = pxToMs(anchorPx, next.viewStartMs, next.pxPerDay);
    expect(msUnderAnchorAfter).toBeCloseTo(msUnderAnchorBefore, 5);
  });

  it("clamps the resulting pxPerDay to the given bounds", () => {
    const viewport = { viewStartMs: 0, pxPerDay: 40 };
    expect(zoomAtPoint(viewport, 0, 1000, 0.1, 100).pxPerDay).toBe(100);
    expect(zoomAtPoint(viewport, 0, 0.0001, 0.1, 100).pxPerDay).toBe(0.1);
  });
});

describe("presetToPxPerDay", () => {
  it("divides container width by the preset's target visible days", () => {
    expect(presetToPxPerDay("week", 700)).toBeCloseTo(70, 5);
    expect(presetToPxPerDay("year", 800)).toBeCloseTo(2, 5);
  });
});

describe("getLodTier", () => {
  it("selects the correct tier at threshold boundaries", () => {
    expect(getLodTier(200)).toBe("day");
    expect(getLodTier(80)).toBe("day");
    expect(getLodTier(79.9)).toBe("week");
    expect(getLodTier(20)).toBe("week");
    expect(getLodTier(19.9)).toBe("biweek");
    expect(getLodTier(4)).toBe("biweek");
    expect(getLodTier(3.9)).toBe("month");
    expect(getLodTier(1)).toBe("month");
    expect(getLodTier(0.9)).toBe("quarter");
    expect(getLodTier(0.3)).toBe("quarter");
    expect(getLodTier(0.29)).toBe("year");
  });
});

describe("clamp", () => {
  it("clamps within bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
