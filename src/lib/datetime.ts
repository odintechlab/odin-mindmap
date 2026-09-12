/**
 * Fixed calendar for due dates, date-range filters, and week buckets.
 * People/dashboard metrics run on the API server, so host-local Date
 * methods made local (UTC+8) and deploy (UTC) disagree.
 */
export const APP_TIMEZONE =
  (typeof process !== "undefined" && process.env.APP_TIMEZONE?.trim()) ||
  "Asia/Ulaanbaatar";

export const DAY_MS = 86_400_000;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const dayPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  weekday: "short",
});

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  hourCycle: "h23",
  hour: "2-digit",
});

function partsMap(ts: number): Record<string, string> {
  const map: Record<string, string> = {};
  for (const part of dayPartsFormatter.formatToParts(new Date(ts))) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return map;
}

/** Hour of day 0–23 in {@link APP_TIMEZONE}. */
export function hourInAppTz(ts: number): number {
  const hourPart = hourFormatter
    .formatToParts(new Date(ts))
    .find((part) => part.type === "hour");
  const hour = Number(hourPart?.value);
  return Number.isFinite(hour) ? hour : 0;
}

/** Core work window: 08:00–18:00 (hours 8–17 inclusive). */
export function isCoreWorkHour(hour: number): boolean {
  return hour >= 8 && hour < 18;
}

/** Format an hour bucket as `14:00–15:00`. */
export function formatHourRange(hour: number): string {
  const start = String(((hour % 24) + 24) % 24).padStart(2, "0");
  const end = String((((hour % 24) + 24) % 24 + 1) % 24).padStart(2, "0");
  return `${start}:00–${end}:00`;
}

/** YYYY-MM-DD in {@link APP_TIMEZONE}. */
export function calendarDayKey(ts: number): string {
  const map = partsMap(ts);
  return `${map.year}-${map.month}-${map.day}`;
}

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const check = new Date(utc);
  return (
    check.getUTCFullYear() === y &&
    check.getUTCMonth() === m - 1 &&
    check.getUTCDate() === d
  );
}

/** Offset (ms) such that `utcMs + offset ≈ wall-clock fields in APP_TIMEZONE`. */
function timeZoneOffsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - utcMs;
}

function zonedMidnightMs(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  const utcDate = Date.UTC(y, m - 1, d);
  const first = utcDate - timeZoneOffsetMs(utcDate);
  return utcDate - timeZoneOffsetMs(first);
}

function nextIsoDate(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, "0"),
    String(next.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function startOfDay(ts: number): number {
  return zonedMidnightMs(calendarDayKey(ts));
}

/** Inclusive end of a YYYY-MM-DD calendar day in {@link APP_TIMEZONE}. */
export function endOfIsoDate(dayKey: string): number | null {
  if (!isValidIsoDate(dayKey)) return null;
  return zonedMidnightMs(nextIsoDate(dayKey)) - 1;
}

export function startOfIsoDate(dayKey: string): number | null {
  if (!isValidIsoDate(dayKey)) return null;
  return zonedMidnightMs(dayKey);
}

function weekdayInAppTz(ts: number): number {
  const label = weekdayFormatter.format(new Date(ts)).replace(/\.$/, "");
  return WEEKDAY_SHORT[label] ?? 0;
}

/** Monday-start week, in {@link APP_TIMEZONE}. */
export function startOfWeek(ts: number): number {
  let t = startOfDay(ts);
  for (let i = 0; i < 7; i++) {
    if (weekdayInAppTz(t) === 1) return t;
    t = startOfDay(t - 12 * 60 * 60 * 1000);
  }
  return t;
}

export function formatWeekLabel(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
  });
}
