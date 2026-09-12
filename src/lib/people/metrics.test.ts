import { describe, expect, it } from "vitest";
import type { ClickUpTask } from "@/types/clickup";
import {
  buildHourlyActivitySeries,
  buildWeeklyCompletedSeries,
  compareNeedsAttention,
  computeCycleTimeMedianDays,
  computeLastActiveAt,
  computeOnTime,
  computeOverdueTasks,
  computePeakActiveHour,
  computeStaleTasks,
  countDelivery,
  filterMemberTasks,
  generateInsights,
  percentileVsTeammates,
  buildGradeImprovements,
  computePerformanceGrade,
  STALE_MS,
  startOfWeek,
  weekStartsForRange,
} from "./metrics";
import { parseAbsoluteDateRange } from "@/lib/dashboard/taskMetrics";

const NOW = new Date(2026, 8, 3, 12, 0, 0, 0).getTime();

function task(
  partial: Partial<ClickUpTask> & Pick<ClickUpTask, "id" | "status">,
): ClickUpTask {
  return {
    name: partial.name ?? partial.id,
    url: partial.url ?? `https://example.com/${partial.id}`,
    assignees: partial.assignees ?? [],
    ...partial,
  };
}

const open = {
  id: "s-open",
  status: "open",
  color: "#999",
  orderindex: 0,
  type: "open",
};
const custom = {
  id: "s-custom",
  status: "in progress",
  color: "#00f",
  orderindex: 1,
  type: "custom",
};
const closed = {
  id: "s-closed",
  status: "complete",
  color: "#0f0",
  orderindex: 2,
  type: "closed",
};
const done = {
  id: "s-done",
  status: "done",
  color: "#0f0",
  orderindex: 3,
  type: "done",
};

describe("filterMemberTasks", () => {
  const range = parseAbsoluteDateRange("2026-01-01", "2026-06-30");

  it("returns empty when nothing falls in the range", () => {
    const tasks = [
      task({
        id: "old",
        status: closed,
        date_created: String(new Date(2024, 0, 1).getTime()),
        date_closed: String(new Date(2024, 2, 1).getTime()),
      }),
    ];
    expect(filterMemberTasks(tasks, null, range)).toEqual([]);
  });

  it("filters by listId", () => {
    const tasks = [
      task({
        id: "a",
        status: open,
        list: { id: "list-1", name: "A" },
        date_created: String(new Date(2026, 2, 1).getTime()),
      }),
      task({
        id: "b",
        status: open,
        list: { id: "list-2", name: "B" },
        date_created: String(new Date(2026, 2, 1).getTime()),
      }),
    ];
    const filtered = filterMemberTasks(tasks, "list-1", range);
    expect(filtered.map((t) => t.id)).toEqual(["a"]);
  });
});

describe("countDelivery", () => {
  it("treats done and closed as completed", () => {
    const tasks = [
      task({ id: "o", status: open }),
      task({ id: "p", status: custom }),
      task({ id: "c", status: closed }),
      task({ id: "d", status: done }),
    ];
    expect(countDelivery(tasks)).toEqual({
      completed: 2,
      open: 1,
      inProgress: 1,
      completionRate: 50,
    });
  });
});

describe("computeOnTime", () => {
  it("ignores finished tasks with no due date", () => {
    const tasks = [
      task({
        id: "no-due",
        status: closed,
        date_closed: String(NOW),
      }),
    ];
    expect(computeOnTime(tasks)).toEqual({ rate: null, onTime: 0, dated: 0 });
  });

  it("excludes finished tasks with missing closedAt", () => {
    const tasks = [
      task({
        id: "no-closed",
        status: closed,
        due_date: String(NOW + 86_400_000),
      }),
    ];
    expect(computeOnTime(tasks).dated).toBe(0);
  });

  it("hides the rate until 3 dated completions", () => {
    const due = NOW + 86_400_000;
    const tasks = [
      task({
        id: "a",
        status: closed,
        due_date: String(due),
        date_closed: String(NOW),
      }),
      task({
        id: "b",
        status: done,
        due_date: String(due),
        date_done: String(NOW),
      }),
    ];
    const result = computeOnTime(tasks);
    expect(result.dated).toBe(2);
    expect(result.onTime).toBe(2);
    expect(result.rate).toBeNull();
  });

  it("counts on-time for both done and closed types", () => {
    const due = NOW + 86_400_000;
    const lateDue = NOW - 86_400_000;
    const tasks = [
      task({
        id: "on-closed",
        status: closed,
        due_date: String(due),
        date_closed: String(NOW),
      }),
      task({
        id: "on-done",
        status: done,
        due_date: String(due),
        date_done: String(NOW),
      }),
      task({
        id: "late",
        status: closed,
        due_date: String(lateDue),
        date_closed: String(NOW),
      }),
    ];
    const result = computeOnTime(tasks);
    expect(result.dated).toBe(3);
    expect(result.onTime).toBe(2);
    expect(result.rate).toBe(67);
  });

  it("counts same-calendar-day closes as on time even after midnight due timestamps", () => {
    // Due: 2026-09-03 00:00 Asia/Ulaanbaatar (ClickUp-style date-only).
    const dueMidnight = Date.parse("2026-09-02T16:00:00.000Z");
    // Closed later that same UB calendar day.
    const closedAfternoon = Date.parse("2026-09-03T10:30:00.000Z");
    // Closed the next UB calendar day.
    const closedNextDay = Date.parse("2026-09-04T01:00:00.000Z");
    const tasks = [
      task({
        id: "same-day",
        status: closed,
        due_date: String(dueMidnight),
        date_closed: String(closedAfternoon),
      }),
      task({
        id: "same-day-done",
        status: done,
        due_date: String(dueMidnight),
        date_done: String(closedAfternoon),
      }),
      task({
        id: "next-day",
        status: closed,
        due_date: String(dueMidnight),
        date_closed: String(closedNextDay),
      }),
    ];
    const result = computeOnTime(tasks);
    expect(result.dated).toBe(3);
    expect(result.onTime).toBe(2);
    expect(result.rate).toBe(67);
  });

  it("does not mark same UB due day late when the server runs in UTC", () => {
    // Host-local setHours(0,0,0,0) on UTC would treat due as Sept 2 and close as Sept 3.
    const due = Date.parse("2026-09-02T16:00:00.000Z"); // Sept 3 00:00 UB
    const closedAt = Date.parse("2026-09-03T10:00:00.000Z"); // Sept 3 18:00 UB
    const tasks = [
      task({
        id: "a",
        status: closed,
        due_date: String(due),
        date_closed: String(closedAt),
      }),
      task({
        id: "b",
        status: done,
        due_date: String(due),
        date_done: String(closedAt),
      }),
      task({
        id: "c",
        status: closed,
        due_date: String(due),
        date_closed: String(closedAt),
      }),
    ];
    const result = computeOnTime(tasks);
    expect(result.dated).toBe(3);
    expect(result.onTime).toBe(3);
    expect(result.rate).toBe(100);
  });
});

describe("computeOverdueTasks", () => {
  it("does not count finished tasks as overdue", () => {
    const past = String(NOW - 86_400_000);
    const tasks = [
      task({ id: "open-late", status: open, due_date: past }),
      task({ id: "done-late", status: done, due_date: past, date_done: past }),
      task({
        id: "closed-late",
        status: closed,
        due_date: past,
        date_closed: past,
      }),
    ];
    expect(computeOverdueTasks(tasks, NOW).map((t) => t.id)).toEqual([
      "open-late",
    ]);
  });
});

describe("computeStaleTasks", () => {
  it("flags open work not updated within 14 days", () => {
    const stale = String(NOW - STALE_MS - 1000);
    const fresh = String(NOW - 86_400_000);
    const tasks = [
      task({ id: "stale", status: open, date_updated: stale }),
      task({ id: "fresh", status: custom, date_updated: fresh }),
      task({
        id: "done-old",
        status: done,
        date_updated: stale,
        date_done: stale,
      }),
      task({ id: "never", status: open }),
    ];
    expect(computeStaleTasks(tasks, NOW).map((t) => t.id).sort()).toEqual([
      "never",
      "stale",
    ]);
  });
});

describe("computeCycleTimeMedianDays", () => {
  it("returns null with fewer than 3 finished samples", () => {
    const tasks = [
      task({
        id: "a",
        status: closed,
        date_created: String(NOW - 2 * 86_400_000),
        date_closed: String(NOW),
      }),
      task({
        id: "b",
        status: done,
        start_date: String(NOW - 4 * 86_400_000),
        date_done: String(NOW),
      }),
    ];
    expect(computeCycleTimeMedianDays(tasks)).toBeNull();
  });

  it("uses start_date when present, otherwise date_created", () => {
    const tasks = [
      task({
        id: "a",
        status: closed,
        date_created: String(NOW - 10 * 86_400_000),
        date_closed: String(NOW),
      }),
      task({
        id: "b",
        status: closed,
        start_date: String(NOW - 4 * 86_400_000),
        date_created: String(NOW - 20 * 86_400_000),
        date_closed: String(NOW),
      }),
      task({
        id: "c",
        status: done,
        date_created: String(NOW - 6 * 86_400_000),
        date_done: String(NOW),
      }),
    ];
    expect(computeCycleTimeMedianDays(tasks)).toBe(6);
  });
});

describe("computeLastActiveAt", () => {
  it("returns the max date_updated", () => {
    const tasks = [
      task({ id: "a", status: open, date_updated: "100" }),
      task({ id: "b", status: open, date_updated: "300" }),
      task({ id: "c", status: open, date_updated: "200" }),
    ];
    expect(computeLastActiveAt(tasks)).toBe("300");
  });

  it("returns null when nothing has been updated", () => {
    expect(computeLastActiveAt([task({ id: "a", status: open })])).toBeNull();
  });
});

describe("weekStartsForRange", () => {
  it("returns last 4 weeks when the range is all-time", () => {
    const starts = weekStartsForRange(null, null, NOW);
    expect(starts).toHaveLength(4);
    expect(starts[0]).toBe(startOfWeek(NOW - 3 * 7 * 86_400_000));
  });
});

describe("buildWeeklyCompletedSeries", () => {
  it("buckets done and closed completions into weeks", () => {
    const week = startOfWeek(NOW);
    const tasks = [
      task({
        id: "c",
        status: closed,
        date_closed: String(week + 86_400_000),
      }),
      task({
        id: "d",
        status: done,
        date_done: String(week + 2 * 86_400_000),
      }),
    ];
    const series = buildWeeklyCompletedSeries(tasks, [week], null);
    expect(series[0]?.count).toBe(2);
  });
});

describe("percentileVsTeammates", () => {
  it("returns null for a single person", () => {
    expect(percentileVsTeammates(4, [4], true)).toBeNull();
  });

  it("ranks completed as higher-is-better", () => {
    expect(percentileVsTeammates(8, [2, 4, 8], true)).toBe(100);
    expect(percentileVsTeammates(2, [2, 4, 8], true)).toBe(0);
  });
});

describe("compareNeedsAttention", () => {
  it("sorts overdue then stale then oldest activity", () => {
    const a = { overdue: 1, stale: 0, lastActiveAt: "9" };
    const b = { overdue: 2, stale: 0, lastActiveAt: "9" };
    const c = { overdue: 1, stale: 3, lastActiveAt: "9" };
    const d = { overdue: 1, stale: 0, lastActiveAt: "1" };
    const sorted = [a, b, c, d].sort(compareNeedsAttention);
    expect(sorted).toEqual([b, c, d, a]);
  });
});

describe("generateInsights", () => {
  it("cites overdue and on-time numbers already on screen", () => {
    const insights = generateInsights({
      now: NOW,
      completed: 12,
      open: 8,
      inProgress: 4,
      overdue: 8,
      stale: 0,
      lastActiveAt: String(NOW - 18 * 86_400_000),
      datedCompletions: 12,
      onTimeCount: 11,
      collabOpen: 4,
    });
    expect(insights[0]).toMatchObject({
      id: "overdueOfOpen",
      params: { overdue: 8, openTotal: 12 },
    });
    expect(insights.some((s) => s.id === "lastUpdateDaysAgo" && s.params?.days === 18)).toBe(
      true,
    );
    expect(
      insights.some(
        (s) =>
          s.id === "finishedOnTime" &&
          s.params?.onTimeCount === 11 &&
          s.params?.datedCompletions === 12,
      ),
    ).toBe(true);
    expect(
      insights.some(
        (s) => s.id === "collabOpen" && s.params?.collabOpen === 4 && s.params?.openTotal === 12,
      ),
    ).toBe(true);
  });
});

describe("computePerformanceGrade", () => {
  it("returns insufficient when there is no work", () => {
    expect(
      computePerformanceGrade({
        now: NOW,
        completed: 0,
        open: 0,
        inProgress: 0,
        overdue: 0,
        stale: 0,
        lastActiveAt: null,
        onTimeRate: null,
        datedCompletions: 0,
        completionRate: 0,
      }),
    ).toMatchObject({ level: "insufficient", reasonId: "noData" });
  });

  it("marks cold people with no open work as inactive, not average", () => {
    // Anujin-like: 1 completion, 0 open, last active ~9 weeks ago.
    expect(
      computePerformanceGrade({
        now: NOW,
        completed: 1,
        open: 0,
        inProgress: 0,
        overdue: 0,
        stale: 0,
        lastActiveAt: String(NOW - 63 * 86_400_000),
        onTimeRate: null,
        datedCompletions: 0,
        completionRate: 100,
      }),
    ).toMatchObject({ level: "insufficient", reasonId: "inactive", score: 0 });
  });

  it("marks cold people whose only open work is stale as inactive", () => {
    // Munkhtsogt-like: 1 open stale task, last active ~9 weeks ago.
    expect(
      computePerformanceGrade({
        now: NOW,
        completed: 1,
        open: 1,
        inProgress: 0,
        overdue: 0,
        stale: 1,
        lastActiveAt: String(NOW - 63 * 86_400_000),
        onTimeRate: null,
        datedCompletions: 0,
        completionRate: 50,
      }),
    ).toMatchObject({ level: "insufficient", reasonId: "inactive", score: 0 });
  });

  it("still grades recent finishers with no open work", () => {
    const grade = computePerformanceGrade({
      now: NOW,
      completed: 5,
      open: 0,
      inProgress: 0,
      overdue: 0,
      stale: 0,
      lastActiveAt: String(NOW - 2 * 86_400_000),
      onTimeRate: 90,
      datedCompletions: 5,
      completionRate: 100,
    });
    expect(grade.level).not.toBe("insufficient");
    expect(grade.reasonId).not.toBe("inactive");
  });

  it("scores healthy delivery as good", () => {
    const grade = computePerformanceGrade({
      now: NOW,
      completed: 12,
      open: 2,
      inProgress: 1,
      overdue: 0,
      stale: 0,
      lastActiveAt: String(NOW - 2 * 86_400_000),
      onTimeRate: 90,
      datedCompletions: 10,
      completionRate: 80,
    });
    expect(grade.level).toBe("good");
    expect(grade.score).toBeGreaterThanOrEqual(70);
  });

  it("scores heavy overdue and cold activity as bad", () => {
    const grade = computePerformanceGrade({
      now: NOW,
      completed: 2,
      open: 6,
      inProgress: 2,
      overdue: 6,
      stale: 4,
      lastActiveAt: String(NOW - 25 * 86_400_000),
      onTimeRate: 40,
      datedCompletions: 5,
      completionRate: 20,
    });
    expect(grade.level).toBe("bad");
    expect(["overdueHeavy", "staleWork", "coldActivity", "lateDelivery"]).toContain(
      grade.reasonId,
    );
  });

  it("does not treat 1 of 1 overdue as heavy backlog", () => {
    const grade = computePerformanceGrade({
      now: NOW,
      completed: 34,
      open: 0,
      inProgress: 1,
      overdue: 1,
      stale: 1,
      lastActiveAt: String(NOW - 5 * 86_400_000),
      onTimeRate: null,
      datedCompletions: 0,
      completionRate: 97,
    });
    expect(grade.reasonId).toBe("overdueOpen");
    expect(grade.score).toBeGreaterThanOrEqual(40);
  });

  it("suggests clearing overdue and stale work", () => {
    const tips = buildGradeImprovements({
      now: NOW,
      completed: 34,
      open: 0,
      inProgress: 1,
      overdue: 1,
      stale: 1,
      lastActiveAt: String(NOW - 5 * 86_400_000),
      onTimeRate: null,
      datedCompletions: 0,
      completionRate: 97,
    });
    expect(tips.map((t) => t.id)).toEqual(["finishOverdue", "touchStale"]);
  });

  it("matches roster vs detail for the same absolute signals", () => {
    // Nyambaa-like: strong completion, no overdue, but cold + stale open work.
    const input = {
      now: NOW,
      completed: 69,
      open: 0,
      inProgress: 4,
      overdue: 0,
      stale: 4,
      lastActiveAt: String(NOW - 21 * 86_400_000),
      onTimeRate: null as number | null,
      datedCompletions: 0,
      completionRate: 95,
    };
    const rosterGrade = computePerformanceGrade(input);
    const detailGrade = computePerformanceGrade(input);
    expect(detailGrade).toEqual(rosterGrade);
    expect(rosterGrade.level).toBe("bad");
    expect(rosterGrade.score).toBeLessThan(40);
  });
});

describe("buildHourlyActivitySeries / computePeakActiveHour", () => {
  it("returns empty peak when there are no signals", () => {
    const series = buildHourlyActivitySeries(
      [task({ id: "open-only", status: open })],
      null,
    );
    expect(series).toHaveLength(24);
    expect(series.every((p) => p.count === 0)).toBe(true);
    expect(computePeakActiveHour(series)).toBeNull();
  });

  it("buckets updates in Asia/Ulaanbaatar and prefers core on ties", () => {
    // 14:15 UB
    const afternoon = Date.parse("2026-09-03T06:15:00.000Z");
    // 07:30 UB (outside core)
    const early = Date.parse("2026-09-02T23:30:00.000Z");
    // 20:00 UB (overtime)
    const evening = Date.parse("2026-09-03T12:00:00.000Z");

    const series = buildHourlyActivitySeries(
      [
        task({
          id: "a",
          status: closed,
          date_updated: String(afternoon),
          date_closed: String(afternoon),
        }),
        task({
          id: "b",
          status: closed,
          date_updated: String(early),
          date_closed: String(early),
        }),
        task({
          id: "c",
          status: done,
          date_updated: String(evening),
          date_done: String(evening),
        }),
        task({
          id: "d",
          status: closed,
          date_updated: String(afternoon),
          date_closed: String(afternoon),
        }),
      ],
      null,
    );

    expect(series[14]?.count).toBe(2);
    expect(series[7]?.count).toBe(1);
    expect(series[20]?.count).toBe(1);
    expect(series[14]?.core).toBe(true);
    expect(series[7]?.core).toBe(false);
    expect(series[20]?.core).toBe(false);
    expect(computePeakActiveHour(series)).toBe(14);
  });

  it("allows overtime peaks outside 08:00–18:00", () => {
    const evening = Date.parse("2026-09-03T12:00:00.000Z"); // 20:00 UB
    const series = buildHourlyActivitySeries(
      [
        task({
          id: "e1",
          status: closed,
          date_updated: String(evening),
          date_closed: String(evening),
        }),
        task({
          id: "e2",
          status: closed,
          date_updated: String(evening),
          date_closed: String(evening),
        }),
        task({
          id: "day",
          status: closed,
          date_updated: String(Date.parse("2026-09-03T02:00:00.000Z")), // 10:00 UB
          date_closed: String(Date.parse("2026-09-03T02:00:00.000Z")),
        }),
      ],
      null,
    );
    expect(computePeakActiveHour(series)).toBe(20);
  });

  it("dedupes update + close in the same hour for one task", () => {
    const ts = Date.parse("2026-09-03T06:15:00.000Z");
    const series = buildHourlyActivitySeries(
      [
        task({
          id: "one",
          status: closed,
          date_updated: String(ts),
          date_closed: String(ts + 60_000),
        }),
      ],
      null,
    );
    expect(series[14]?.count).toBe(1);
  });
});
