import { describe, expect, it } from "vitest";
import {
  CATCH_UP_AFTER_DUE_MS,
  countTaskBuckets,
  getClosedAt,
  getMetricClosedAt,
  isFinishedStatus,
  parseAbsoluteDateRange,
  taskInAbsoluteRange,
} from "./taskMetrics";
import type { ClickUpTask } from "@/types/clickup";

function task(partial: Partial<ClickUpTask> & Pick<ClickUpTask, "id" | "status">): ClickUpTask {
  return {
    name: partial.name ?? partial.id,
    url: partial.url ?? `https://example.com/${partial.id}`,
    assignees: partial.assignees ?? [],
    ...partial,
  };
}

describe("parseAbsoluteDateRange", () => {
  it("returns null when either bound is missing", () => {
    expect(parseAbsoluteDateRange(null, "2026-06-30")).toBeNull();
    expect(parseAbsoluteDateRange("2026-01-01", "")).toBeNull();
  });

  it("returns null when from is after to", () => {
    expect(parseAbsoluteDateRange("2026-07-01", "2026-01-01")).toBeNull();
  });

  it("parses inclusive Asia/Ulaanbaatar day bounds", () => {
    const range = parseAbsoluteDateRange("2026-01-01", "2026-06-30");
    expect(range).not.toBeNull();
    expect(range!.from).toBe("2026-01-01");
    expect(range!.to).toBe("2026-06-30");
    // Jan 1 00:00 UB = Dec 31 16:00 UTC; Jun 30 23:59:59.999 UB = Jun 30 15:59:59.999 UTC
    expect(range!.fromMs).toBe(Date.parse("2025-12-31T16:00:00.000Z"));
    expect(range!.toMs).toBe(Date.parse("2026-06-30T15:59:59.999Z"));
  });

  it("rejects invalid calendar dates", () => {
    expect(parseAbsoluteDateRange("2026-02-31", "2026-03-01")).toBeNull();
  });
});

describe("taskInAbsoluteRange", () => {
  const fromMs = new Date(2026, 0, 1).getTime();
  const toMs = new Date(2026, 5, 30, 23, 59, 59, 999).getTime();

  it("includes tasks created in range", () => {
    const t = task({
      id: "a",
      status: { id: "1", status: "open", color: "#000", orderindex: 0, type: "open" },
      date_created: String(new Date(2026, 2, 15).getTime()),
    });
    expect(taskInAbsoluteRange(t, fromMs, toMs)).toBe(true);
  });

  it("includes closed tasks closed in range", () => {
    const t = task({
      id: "b",
      status: { id: "1", status: "complete", color: "#0f0", orderindex: 0, type: "closed" },
      date_created: String(new Date(2025, 0, 1).getTime()),
      date_closed: String(new Date(2026, 3, 1).getTime()),
    });
    expect(taskInAbsoluteRange(t, fromMs, toMs)).toBe(true);
  });

  it("includes done-type tasks finished in range via date_done", () => {
    const t = task({
      id: "done-in-range",
      status: { id: "1", status: "complete", color: "#0f0", orderindex: 0, type: "done" },
      date_created: String(new Date(2025, 0, 1).getTime()),
      date_done: String(new Date(2026, 2, 1).getTime()),
      date_updated: String(new Date(2026, 7, 1).getTime()),
    });
    expect(taskInAbsoluteRange(t, fromMs, toMs)).toBe(true);
  });

  it("includes open tasks created before the range with no start/due", () => {
    const t = task({
      id: "open-old",
      status: { id: "1", status: "open", color: "#000", orderindex: 0, type: "open" },
      date_created: String(new Date(2025, 6, 1).getTime()),
      date_updated: String(new Date(2025, 8, 1).getTime()),
    });
    expect(taskInAbsoluteRange(t, fromMs, toMs)).toBe(true);
  });

  it("includes tasks with due date in range when created earlier", () => {
    const t = task({
      id: "due-in-range",
      status: { id: "1", status: "open", color: "#000", orderindex: 0, type: "open" },
      date_created: String(new Date(2024, 0, 1).getTime()),
      date_updated: String(new Date(2024, 0, 2).getTime()),
      due_date: String(new Date(2026, 3, 15).getTime()),
    });
    expect(taskInAbsoluteRange(t, fromMs, toMs)).toBe(true);
  });

  it("includes open tasks updated in range", () => {
    const t = task({
      id: "c",
      status: { id: "1", status: "in progress", color: "#00f", orderindex: 0, type: "custom" },
      date_created: String(new Date(2025, 0, 1).getTime()),
      date_updated: String(new Date(2026, 1, 10).getTime()),
    });
    expect(taskInAbsoluteRange(t, fromMs, toMs)).toBe(true);
  });

  it("excludes closed tasks outside the window", () => {
    const t = task({
      id: "d",
      status: { id: "1", status: "complete", color: "#0f0", orderindex: 0, type: "closed" },
      date_created: String(new Date(2025, 0, 1).getTime()),
      date_closed: String(new Date(2025, 6, 1).getTime()),
      date_updated: String(new Date(2026, 2, 1).getTime()),
    });
    expect(taskInAbsoluteRange(t, fromMs, toMs)).toBe(false);
  });
});

describe("isFinishedStatus", () => {
  it("re-exports shared ClickUp helper", () => {
    expect(isFinishedStatus("closed")).toBe(true);
    expect(isFinishedStatus("done")).toBe(true);
  });
});

describe("getMetricClosedAt", () => {
  it("uses the earlier of date_closed and date_done", () => {
    const earlier = Date.parse("2026-03-01T00:00:00.000Z");
    const later = Date.parse("2026-03-10T00:00:00.000Z");
    const t = task({
      id: "both",
      status: { id: "1", status: "complete", color: "#0f0", orderindex: 0, type: "closed" },
      date_closed: String(later),
      date_done: String(earlier),
    });
    expect(getClosedAt(t)).toBe(earlier);
    expect(getMetricClosedAt(t)).toBe(earlier);
  });

  it("attributes catch-up closes to the due day", () => {
    // Due: 2026-09-03 00:00 Asia/Ulaanbaatar
    const due = Date.parse("2026-09-02T16:00:00.000Z");
    const dueEnd = Date.parse("2026-09-03T15:59:59.999Z");
    const markedMuchLater = dueEnd + CATCH_UP_AFTER_DUE_MS + 86_400_000;
    const t = task({
      id: "catch-up",
      status: { id: "1", status: "complete", color: "#0f0", orderindex: 0, type: "done" },
      due_date: String(due),
      date_done: String(markedMuchLater),
    });
    expect(getClosedAt(t)).toBe(markedMuchLater);
    expect(getMetricClosedAt(t)).toBe(dueEnd);
  });

  it("keeps genuine late closes within the grace window", () => {
    const due = Date.parse("2026-09-02T16:00:00.000Z");
    const dueEnd = Date.parse("2026-09-03T15:59:59.999Z");
    const closedTwoDaysLate = dueEnd + 2 * 86_400_000;
    const t = task({
      id: "late",
      status: { id: "1", status: "complete", color: "#0f0", orderindex: 0, type: "closed" },
      due_date: String(due),
      date_closed: String(closedTwoDaysLate),
    });
    expect(getMetricClosedAt(t)).toBe(closedTwoDaysLate);
  });
});

describe("countTaskBuckets", () => {
  const pastDue = String(Date.now() - 86_400_000);
  const futureDue = String(Date.now() + 86_400_000);

  it("does not count done or closed tasks as overdue", () => {
    const tasks = [
      task({
        id: "open-overdue",
        status: { id: "1", status: "open", color: "#000", orderindex: 0, type: "open" },
        due_date: pastDue,
      }),
      task({
        id: "done-past-due",
        status: { id: "2", status: "complete", color: "#0f0", orderindex: 0, type: "done" },
        due_date: pastDue,
      }),
      task({
        id: "closed-past-due",
        status: { id: "3", status: "complete", color: "#0f0", orderindex: 0, type: "closed" },
        due_date: pastDue,
      }),
      task({
        id: "open-future",
        status: { id: "4", status: "open", color: "#000", orderindex: 0, type: "open" },
        due_date: futureDue,
      }),
    ];
    const counts = countTaskBuckets(tasks);
    expect(counts.overdue).toBe(1);
    expect(counts.closed).toBe(2);
    expect(counts.open).toBe(2);
  });
});
