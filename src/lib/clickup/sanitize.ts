import type { TaskCreatePayload, TaskUpdatePayload } from "@/types/clickup";
import { isValidIsoDate, startOfIsoDate } from "@/lib/datetime";
import { clickupPathId } from "./ids";

const MAX_NAME = 1000;
const MAX_STATUS = 100;
const MAX_ASSIGNEE_BATCH = 50;

function positiveIntIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((n): n is number => Number.isInteger(n) && n > 0)
    .slice(0, MAX_ASSIGNEE_BATCH);
}

/** Accept null (clear), YYYY-MM-DD, or a positive unix-ms number/string. */
function optionalClickUpDate(
  value: unknown,
  field: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === null) return { ok: true, value: null };
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (isValidIsoDate(trimmed)) {
      const ms = startOfIsoDate(trimmed);
      if (ms == null) return { ok: false, error: `${field} is invalid` };
      return { ok: true, value: String(ms) };
    }
    if (/^\d{10,16}$/.test(trimmed)) {
      return { ok: true, value: trimmed };
    }
    return { ok: false, error: `${field} is invalid` };
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return { ok: true, value: String(Math.trunc(value)) };
  }
  return { ok: false, error: `${field} is invalid` };
}

export function sanitizeTaskUpdate(
  body: unknown,
): { ok: true; payload: TaskUpdatePayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }
  const b = body as Record<string, unknown>;
  const payload: TaskUpdatePayload = {};

  if (b.name !== undefined) {
    if (typeof b.name !== "string") {
      return { ok: false, error: "Task name is invalid" };
    }
    const name = b.name.trim();
    if (!name || name.length > MAX_NAME) {
      return { ok: false, error: "Task name is required" };
    }
    payload.name = name;
  }

  if (b.status !== undefined) {
    if (typeof b.status !== "string" || !b.status.trim() || b.status.length > MAX_STATUS) {
      return { ok: false, error: "Status is invalid" };
    }
    payload.status = b.status.trim();
  }

  if (b.priority !== undefined) {
    if (b.priority !== null && !(Number.isInteger(b.priority) && (b.priority as number) >= 1 && (b.priority as number) <= 4)) {
      return { ok: false, error: "Priority is invalid" };
    }
    payload.priority = b.priority as number | null;
  }

  if (b.assignees !== undefined) {
    if (!b.assignees || typeof b.assignees !== "object") {
      return { ok: false, error: "Assignees are invalid" };
    }
    const raw = b.assignees as { add?: unknown; rem?: unknown };
    payload.assignees = {
      add: positiveIntIds(raw.add),
      rem: positiveIntIds(raw.rem),
    };
  }

  if (b.start_date !== undefined) {
    const start = optionalClickUpDate(b.start_date, "Start date");
    if (!start.ok) return start;
    payload.start_date = start.value;
  }

  if (b.due_date !== undefined) {
    const due = optionalClickUpDate(b.due_date, "Due date");
    if (!due.ok) return due;
    payload.due_date = due.value;
  }

  if (
    payload.start_date &&
    payload.due_date &&
    Number(payload.start_date) > Number(payload.due_date)
  ) {
    return { ok: false, error: "Start date must be on or before due date" };
  }

  if (Object.keys(payload).length === 0) {
    return { ok: false, error: "No valid fields to update" };
  }
  return { ok: true, payload };
}

export function sanitizeTaskCreate(
  body: unknown,
): { ok: true; payload: TaskCreatePayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string") {
    return { ok: false, error: "Task name is required" };
  }
  const name = b.name.trim();
  if (!name || name.length > MAX_NAME) {
    return { ok: false, error: "Task name is required" };
  }

  const payload: TaskCreatePayload = { name };

  if (b.parent !== undefined) {
    if (typeof b.parent !== "string") {
      return { ok: false, error: "Parent task is invalid" };
    }
    try {
      payload.parent = clickupPathId(b.parent);
    } catch {
      return { ok: false, error: "Parent task is invalid" };
    }
  }

  if (b.assignees !== undefined) {
    payload.assignees = positiveIntIds(b.assignees);
  }

  return { ok: true, payload };
}
