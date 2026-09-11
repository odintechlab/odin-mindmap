"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { PRIORITY_OPTIONS } from "@/lib/mindmap/constants";
import { updateTask } from "@/lib/mindmap/api";
import { calendarDayKey } from "@/lib/datetime";
import {
  priorityMessageKey,
  useI18n,
} from "@/components/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { isTaskType, type MindMapNodeData, type NodeRecord, type NodeType } from "@/types/mindmap";
import type { MemberOption } from "./MindMapToolbar";
import type { ClickUpUser } from "@/types/clickup";

function msToDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const ms = Number(value);
  if (!Number.isFinite(ms)) return "";
  return calendarDayKey(ms);
}

interface NodeDetailPanelProps {
  node: NodeRecord | null;
  readOnly?: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, data: MindMapNodeData) => void;
  onDelete?: () => Promise<void>;
  onAddSubtask?: (name: string) => Promise<void>;
  members?: MemberOption[];
}

function nodeTypeKey(type: NodeType): MessageKey {
  return `nodeType.${type}` as MessageKey;
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
  const { t, formatDate } = useI18n();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
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
    setStartDate(msToDateInput(data.startDate));
    setDueDate(msToDateInput(data.dueDate));
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
        start_date?: string | null;
        due_date?: string | null;
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

      const existingStart = msToDateInput(data.startDate);
      const existingDue = msToDateInput(data.dueDate);
      if (startDate !== existingStart) {
        payload.start_date = startDate || null;
      }
      if (dueDate !== existingDue) {
        payload.due_date = dueDate || null;
      }

      if (startDate && dueDate && startDate > dueDate) {
        setError(t("error.startAfterDue"));
        return;
      }

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
        startDate: task.start_date ?? null,
        dueDate: task.due_date ?? null,
        assignees: task.assignees?.map((a: ClickUpUser) => ({
          id: a.id,
          username: a.username,
          profilePicture: a.profilePicture,
        })),
      };

      if (!task.priority) updated.priority = undefined;

      onUpdate(node.id, updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.save"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    const confirmed = window.confirm(
      t("mindmap.deleteConfirm", { name: data?.label ?? "" }),
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.deleteTask"));
    } finally {
      setDeleting(false);
    }
  };

  const handleAddSubtask = async () => {
    if (!onAddSubtask) return;
    const trimmed = subtaskName.trim();
    if (!trimmed) {
      setError(t("error.enterSubtaskName"));
      return;
    }

    setAddingSubtask(true);
    setError(null);
    try {
      await onAddSubtask(trimmed);
      setSubtaskName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.createSubtask"));
    } finally {
      setAddingSubtask(false);
    }
  };

  if (!node || !data) return null;

  const statusOptions = data.statuses ?? (data.status ? [data.status] : []);
  const sortedMembers = [...members].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <aside className="glass-strong relative z-10 flex w-full flex-col border-[var(--border)] md:w-80 md:border-l shadow-surface-lg">
      <div className="h-0.5 bg-[var(--accent)]" />

      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{t("common.details")}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/8 dark:hover:text-zinc-200"
          aria-label={t("dashboard.closePanel")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-5 pb-5 space-y-5">
        <div>
          <FieldLabel>{t("common.type")}</FieldLabel>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t(nodeTypeKey(data.type))}</p>
        </div>

        {editable ? (
          <div className="space-y-4">
            <div>
              <FieldLabel>{t("common.name")}</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {statusOptions.length > 0 && (
              <div>
                <FieldLabel>{t("common.status")}</FieldLabel>
                <Select
                  value={status || "__pending__"}
                  onValueChange={setStatus}
                >
                  <SelectTrigger aria-label={t("common.status")}>
                    <SelectValue placeholder={t("common.selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    {!status ? (
                      <SelectItem value="__pending__" disabled>
                        {t("common.selectStatus")}
                      </SelectItem>
                    ) : null}
                    {statusOptions.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <FieldLabel>{t("common.priority")}</FieldLabel>
              <Select
                value={priority || "none"}
                onValueChange={(next) => setPriority(next === "none" ? "" : next)}
              >
                <SelectTrigger aria-label={t("common.priority")}>
                  <SelectValue placeholder={t("common.none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.none")}</SelectItem>
                  {PRIORITY_OPTIONS.map((p) => {
                    const key = priorityMessageKey(p.value);
                    return (
                      <SelectItem key={p.value} value={String(p.value)}>
                        {key ? t(key) : p.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {sortedMembers.length > 0 && (
              <div>
                <FieldLabel>{t("common.assignees")}</FieldLabel>
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

            <div>
              <FieldLabel>{t("common.startDate")}</FieldLabel>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={saving}
                  aria-label={t("common.startDate")}
                />
                {startDate ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStartDate("")}
                    disabled={saving}
                    className="shrink-0"
                  >
                    {t("common.clearDate")}
                  </Button>
                ) : null}
              </div>
            </div>

            <div>
              <FieldLabel>{t("common.dueDate")}</FieldLabel>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={saving}
                  aria-label={t("common.dueDate")}
                />
                {dueDate ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDueDate("")}
                    disabled={saving}
                    className="shrink-0"
                  >
                    {t("common.clearDate")}
                  </Button>
                ) : null}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? t("common.saving") : t("common.save")}
            </Button>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>
        ) : (
          <>
            <div>
              <FieldLabel>{t("common.name")}</FieldLabel>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{data.label}</p>
            </div>

            {data.status && (
              <div>
                <FieldLabel>{t("common.status")}</FieldLabel>
                <Badge label={data.status.name} color={data.status.color} />
              </div>
            )}

            {data.priority && (
              <div>
                <FieldLabel>{t("common.priority")}</FieldLabel>
                <Badge label={data.priority.label} color={data.priority.color} />
              </div>
            )}
          </>
        )}

        {!editable && data.startDate && (
          <div>
            <FieldLabel>{t("common.startDate")}</FieldLabel>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {formatDate(Number(data.startDate))}
            </p>
          </div>
        )}

        {!editable && data.dueDate && (
          <div>
            <FieldLabel>{t("common.dueDate")}</FieldLabel>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {formatDate(Number(data.dueDate))}
            </p>
          </div>
        )}

        {data.assignees && data.assignees.length > 0 && (
          <div>
            <FieldLabel>{t("common.assignees")}</FieldLabel>
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] px-3 py-2 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            {t("common.openInClickUp")}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 10L10 2M10 2H5M10 2v5" />
            </svg>
          </a>
        )}

        {onAddSubtask && (
          <div className="rounded-xl border border-dashed border-emerald-400/50 bg-emerald-50/50 p-3 dark:border-emerald-500/30 dark:bg-emerald-950/20">
            <FieldLabel>{t("mindmap.addSubtask")}</FieldLabel>
            <div className="flex gap-2">
              <Input
                value={subtaskName}
                onChange={(e) => setSubtaskName(e.target.value)}
                placeholder={t("mindmap.subtaskName")}
                disabled={addingSubtask}
              />
              <Button
                type="button"
                onClick={handleAddSubtask}
                disabled={addingSubtask}
                className="shrink-0"
              >
                {addingSubtask ? "…" : t("common.add")}
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
            {deleting ? t("common.deleting") : t("common.delete")}
          </Button>
        )}
      </div>
    </aside>
  );
}
