import { describe, expect, it } from "vitest";
import { formatPeriodLabel, getHeaderTicks } from "./dateTicks";

const DAY_MS = 86_400_000;

describe("getHeaderTicks", () => {
  it("generates daily minor ticks and monthly major bands at the day tier", () => {
    const start = new Date(2026, 2, 10).getTime(); // Mar 10, 2026
    const end = start + 5 * DAY_MS;
    const ticks = getHeaderTicks(start, end, "day");

    expect(ticks.minor.length).toBeGreaterThan(0);
    expect(ticks.minor.every((t) => typeof t.label === "string")).toBe(true);
    expect(ticks.major.length).toBeGreaterThan(0);
    expect(ticks.major[0].label).toMatch(/2026/);
  });

  it("generates yearly minor ticks and no major band at the year tier", () => {
    const start = new Date(2020, 0, 1).getTime();
    const end = new Date(2026, 0, 1).getTime();
    const ticks = getHeaderTicks(start, end, "year");

    expect(ticks.major).toEqual([]);
    const labels = ticks.minor.map((t) => t.label);
    expect(labels).toContain("2022");
    expect(labels).toContain("2025");
  });

  it("produces monotonically increasing minor tick timestamps", () => {
    const start = Date.now();
    const end = start + 60 * DAY_MS;
    const ticks = getHeaderTicks(start, end, "week");
    for (let i = 1; i < ticks.minor.length; i++) {
      expect(ticks.minor[i].ms).toBeGreaterThan(ticks.minor[i - 1].ms);
    }
  });

  it("covers the requested range with major bands at the month tier", () => {
    const start = new Date(2026, 0, 1).getTime();
    const end = new Date(2027, 0, 1).getTime();
    const ticks = getHeaderTicks(start, end, "month");
    expect(ticks.major.some((b) => b.label === "2026")).toBe(true);
  });
});

describe("formatPeriodLabel", () => {
  it("formats a same-month day-tier range compactly", () => {
    const start = new Date(2026, 2, 3).getTime();
    const end = new Date(2026, 2, 9).getTime();
    expect(formatPeriodLabel(start, end, "day")).toBe("Mar 3 – 9, 2026");
  });

  it("formats a single month at the month tier", () => {
    const start = new Date(2026, 2, 1).getTime();
    const end = new Date(2026, 2, 28).getTime();
    expect(formatPeriodLabel(start, end, "month")).toBe("March 2026");
  });

  it("formats a same-year range at the quarter tier", () => {
    const start = new Date(2026, 0, 1).getTime();
    const end = new Date(2026, 5, 1).getTime();
    expect(formatPeriodLabel(start, end, "quarter")).toBe("2026");
  });

  it("formats a multi-year range at the year tier", () => {
    const start = new Date(2020, 0, 1).getTime();
    const end = new Date(2026, 0, 1).getTime();
    expect(formatPeriodLabel(start, end, "year")).toBe("2020 – 2026");
  });
});
