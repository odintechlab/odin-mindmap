import { describe, expect, it } from "vitest";
import {
  calendarDayKey,
  endOfIsoDate,
  formatHourRange,
  hourInAppTz,
  isCoreWorkHour,
  startOfIsoDate,
  startOfWeek,
} from "./datetime";

describe("calendarDayKey", () => {
  it("uses Asia/Ulaanbaatar, not UTC", () => {
    expect(calendarDayKey(Date.parse("2026-09-02T16:00:00.000Z"))).toBe(
      "2026-09-03",
    );
    expect(calendarDayKey(Date.parse("2026-09-02T15:59:59.000Z"))).toBe(
      "2026-09-02",
    );
  });
});

describe("iso date bounds", () => {
  it("starts and ends the UB calendar day", () => {
    expect(startOfIsoDate("2026-09-03")).toBe(
      Date.parse("2026-09-02T16:00:00.000Z"),
    );
    expect(endOfIsoDate("2026-09-03")).toBe(
      Date.parse("2026-09-03T15:59:59.999Z"),
    );
  });
});

describe("startOfWeek", () => {
  it("returns Monday 00:00 in Ulaanbaatar", () => {
    // Thursday 2026-09-03 12:00 UB
    const thursday = Date.parse("2026-09-03T04:00:00.000Z");
    expect(startOfWeek(thursday)).toBe(Date.parse("2026-08-30T16:00:00.000Z"));
  });
});

describe("hourInAppTz", () => {
  it("uses Asia/Ulaanbaatar wall clock", () => {
    // 2026-09-02 23:30 UTC → 2026-09-03 07:30 UB
    expect(hourInAppTz(Date.parse("2026-09-02T23:30:00.000Z"))).toBe(7);
    // 2026-09-03 06:15 UTC → 2026-09-03 14:15 UB
    expect(hourInAppTz(Date.parse("2026-09-03T06:15:00.000Z"))).toBe(14);
  });
});

describe("isCoreWorkHour / formatHourRange", () => {
  it("marks 08:00–18:00 as core", () => {
    expect(isCoreWorkHour(7)).toBe(false);
    expect(isCoreWorkHour(8)).toBe(true);
    expect(isCoreWorkHour(17)).toBe(true);
    expect(isCoreWorkHour(18)).toBe(false);
  });

  it("formats hour buckets", () => {
    expect(formatHourRange(14)).toBe("14:00–15:00");
    expect(formatHourRange(23)).toBe("23:00–00:00");
  });
});
