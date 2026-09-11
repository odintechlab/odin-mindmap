import { describe, expect, it } from "vitest";
import { sanitizeTaskCreate, sanitizeTaskUpdate } from "./sanitize";

describe("sanitizeTaskUpdate", () => {
  it("rejects empty and unknown bodies", () => {
    expect(sanitizeTaskUpdate(null).ok).toBe(false);
    expect(sanitizeTaskUpdate({}).ok).toBe(false);
  });

  it("accepts a trimmed name and valid priority", () => {
    const result = sanitizeTaskUpdate({ name: "  Hello  ", priority: 2 });
    expect(result).toEqual({
      ok: true,
      payload: { name: "Hello", priority: 2 },
    });
  });

  it("accepts ISO start/due dates and null clears", () => {
    const result = sanitizeTaskUpdate({
      start_date: "2026-09-03",
      due_date: null,
    });
    expect(result).toEqual({
      ok: true,
      payload: {
        start_date: String(Date.parse("2026-09-02T16:00:00.000Z")),
        due_date: null,
      },
    });
  });

  it("rejects start after due", () => {
    const result = sanitizeTaskUpdate({
      start_date: "2026-09-10",
      due_date: "2026-09-03",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects path-like junk in parent on create", () => {
    const result = sanitizeTaskCreate({
      name: "Task",
      parent: "../secret",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a normal create", () => {
    const result = sanitizeTaskCreate({
      name: "New task",
      assignees: [12, "no", -1, 34],
    });
    expect(result).toEqual({
      ok: true,
      payload: { name: "New task", assignees: [12, 34] },
    });
  });
});
