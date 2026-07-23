import { describe, expect, it } from "vitest";
import {
  countTaskBuckets,
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

  it("parses inclusive local day bounds", () => {
    const range = parseAbsoluteDateRange("2026-01-01", "2026-06-30");
    expect(range).not.toBeNull();
    expect(range!.from).toBe("2026-01-01");
    expect(range!.to).toBe("2026-06-30");
    expect(range!.fromMs).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).getTime());
    expect(range!.toMs).toBe(new Date(2026, 5, 30, 23, 59, 59, 999).getTime());
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
  it("treats closed and done as finished", () => {
    expect(isFinishedStatus("closed")).toBe(true);
    expect(isFinishedStatus("done")).toBe(true);
    expect(isFinishedStatus("open")).toBe(false);
    expect(isFinishedStatus("custom")).toBe(false);
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
  });
});
