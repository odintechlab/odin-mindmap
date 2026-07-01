"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { PRIORITY_OPTIONS } from "@/lib/mindmap/constants";
import { updateTask } from "@/lib/mindmap/api";
import { isTaskType, type MindMapNodeData, type NodeRecord } from "@/types/mindmap";
import type { MemberOption } from "./MindMapToolbar";
import type { ClickUpUser } from "@/types/clickup";

interface NodeDetailPanelProps {
  node: NodeRecord | null;
  readOnly?: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, data: MindMapNodeData) => void;
  onDelete?: () => Promise<void>;
  onAddSubtask?: (name: string) => Promise<void>;
  members?: MemberOption[];
}

function formatDate(ms: string | null | undefined): string {
  if (!ms) return "—";
  const date = new Date(parseInt(ms, 10));
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-1.5">
      {children}
    </p>
  );
}

export function NodeDetailPanel({
  node,
  readOnly = false,
  onClose,
  onUpdate,
  onDelete,
  onAddSubtask,
  members = [],
}: NodeDetailPanelProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState<string>("");
  const [subtaskName, setSubtaskName] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = node?.data;
  const editable = data ? isTaskType(data.type) && !readOnly : false;

  useEffect(() => {
    if (!data) return;
    setName(data.label);
    setStatus(data.status?.name ?? "");
    setPriority(data.priority?.id ?? "");
    setSubtaskName("");
    setAssigneeIds(
      (data.assignees ?? [])
        .map((a) => a.id)
        .filter((n) => typeof n === "number" && !Number.isNaN(n)),
    );
    setError(null);
  }, [node?.id, data]);

  const handleSave = async () => {
    if (!node || !data || !editable) return;

    setSaving(true);
    setError(null);

    try {
      const payload: {
        name?: string;
        status?: string;
        priority?: number | null;
        assignees?: { add?: number[]; rem?: number[] };
      } = {};

      if (name !== data.label) payload.name = name;
      if (status && status !== data.status?.name) payload.status = status;
      if (priority !== (data.priority?.id ?? "")) {
        payload.priority = priority ? parseInt(priority, 10) : null;
      }

      const existingAssignees = new Set((data.assignees ?? []).map((a) => a.id));
      const nextAssignees = new Set(assigneeIds);
      const add: number[] = [];
      const rem: number[] = [];
      for (const id of nextAssignees) if (!existingAssignees.has(id)) add.push(id);
      for (const id of existingAssignees) if (!nextAssignees.has(id)) rem.push(id);
      if (add.length > 0 || rem.length > 0) payload.assignees = { add, rem };

      if (Object.keys(payload).length === 0) return;

      const { task } = await updateTask(data.clickupId, payload);

      const updated: MindMapNodeData = {
        ...data,
        label: task.name,
        status: task.status
          ? {
              name: task.status.status,
              color: task.status.color,
              type: task.status.type,
            }
          : data.status,
        priority: task.priority
          ? {
              id: task.priority.id,
              label: task.priority.priority,
              color: task.priority.color,
            }
          : undefined,
        assignees: task.assignees?.map((a: ClickUpUser) => ({
          id: a.id,
          username: a.username,
          profilePicture: a.profilePicture,
        })),
      };

      if (!task.priority) updated.priority = undefined;

      onUpdate(node.id, updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    const confirmed = window.confirm(
      `Delete "${data?.label}" from ClickUp? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddSubtask = async () => {
    if (!onAddSubtask) return;
    const trimmed = subtaskName.trim();
    if (!trimmed) {
      setError("Enter a subtask name");
      return;
    }

    setAddingSubtask(true);
    setError(null);
    try {
      await onAddSubtask(trimmed);
      setSubtaskName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create subtask");
    } finally {
      setAddingSubtask(false);
    }
  };

  if (!node || !data) return null;

  const statusOptions = data.statuses ?? (data.status ? [data.status] : []);
  const sortedMembers = [...members].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <aside className="glass-strong relative z-10 flex w-full flex-col border-[var(--border)] md:w-80 md:border-l shadow-surface-lg">
      <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Details</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/8 dark:hover:text-zinc-200"
          aria-label="Close panel"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-5 pb-5 space-y-5">
        <div>
          <FieldLabel>Type</FieldLabel>
          <p className="text-sm font-medium capitalize text-zinc-700 dark:text-zinc-300">{data.type}</p>
        </div>

        {editable ? (
          <div className="space-y-4">
            <div>
              <FieldLabel>Name</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {statusOptions.length > 0 && (
              <div>
                <FieldLabel>Status</FieldLabel>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {statusOptions.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <FieldLabel>Priority</FieldLabel>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">None</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={String(p.value)}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>

            {sortedMembers.length > 0 && (
              <div>
                <FieldLabel>Assignees</FieldLabel>
                <div className="max-h-48 overflow-auto rounded-xl border border-[var(--border-strong)] bg-[var(--panel-solid)] p-2">
                  <div className="grid grid-cols-1 gap-1">
                    {sortedMembers.map((m) => {
                      const id = parseInt(m.userId, 10);
                      const checked = assigneeIds.includes(id);
                      return (
                        <label
                          key={`${m.teamId}:${m.userId}`}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-800 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/8"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={saving}
                            onChange={() => {
                              setAssigneeIds((prev) => {
                                if (prev.includes(id)) return prev.filter((x) => x !== id);
                                return [...prev, id];
                              });
                            }}
                          />
                          <span className="truncate">{m.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save changes"}
            </Button>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>
        ) : (
          <>
            <div>
              <FieldLabel>Name</FieldLabel>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{data.label}</p>
            </div>

            {data.status && (
              <div>
                <FieldLabel>Status</FieldLabel>
                <Badge label={data.status.name} color={data.status.color} />
              </div>
            )}

            {data.priority && (
              <div>
                <FieldLabel>Priority</FieldLabel>
                <Badge label={data.priority.label} color={data.priority.color} />
              </div>
            )}
          </>
        )}

        {data.dueDate && (
          <div>
            <FieldLabel>Due date</FieldLabel>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {formatDate(data.dueDate)}
            </p>
          </div>
        )}

        {data.assignees && data.assignees.length > 0 && (
          <div>
            <FieldLabel>Assignees</FieldLabel>
            <div className="space-y-2.5">
              {data.assignees.map((a) => (
                <div key={a.username} className="flex items-center gap-2.5">
                  <Avatar name={a.username} src={a.profilePicture} size={28} />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{a.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.url && (
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] px-3 py-2 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
          >
            Open in ClickUp
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 10L10 2M10 2H5M10 2v5" />
            </svg>
          </a>
        )}

        {onAddSubtask && (
          <div className="rounded-xl border border-dashed border-emerald-400/50 bg-emerald-50/50 p-3 dark:border-emerald-500/30 dark:bg-emerald-950/20">
            <FieldLabel>Add subtask</FieldLabel>
            <div className="flex gap-2">
              <Input
                value={subtaskName}
                onChange={(e) => setSubtaskName(e.target.value)}
                placeholder="Subtask name"
                disabled={addingSubtask}
              />
              <Button
                type="button"
                onClick={handleAddSubtask}
                disabled={addingSubtask}
                className="shrink-0"
              >
                {addingSubtask ? "…" : "Add"}
              </Button>
            </div>
          </div>
        )}

        {onDelete && (
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {deleting ? "Deleting…" : "Delete task"}
          </Button>
        )}
      </div>
    </aside>
  );
}
