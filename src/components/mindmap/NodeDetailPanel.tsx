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

interface NodeDetailPanelProps {
  node: NodeRecord | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: MindMapNodeData) => void;
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

export function NodeDetailPanel({ node, onClose, onUpdate }: NodeDetailPanelProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = node?.data;
  const editable = data ? isTaskType(data.type) : false;

  useEffect(() => {
    if (!data) return;
    setName(data.label);
    setStatus(data.status?.name ?? "");
    setPriority(data.priority?.id ?? "");
    setError(null);
  }, [node?.id, data]);

  const handleSave = async () => {
    if (!node || !data || !editable) return;

    setSaving(true);
    setError(null);

    try {
      const payload: { name?: string; status?: string; priority?: number | null } = {};

      if (name !== data.label) payload.name = name;
      if (status && status !== data.status?.name) payload.status = status;
      if (priority !== (data.priority?.id ?? "")) {
        payload.priority = priority ? parseInt(priority, 10) : null;
      }

      if (Object.keys(payload).length === 0) return;

      const { task } = await updateTask(data.clickupId, payload);

      const updated: MindMapNodeData = {
        ...data,
        label: task.name,
        status: task.status
          ? { name: task.status.status, color: task.status.color }
          : data.status,
        priority: task.priority
          ? {
              id: task.priority.id,
              label: task.priority.priority,
              color: task.priority.color,
            }
          : undefined,
      };

      if (!task.priority) updated.priority = undefined;

      onUpdate(node.id, updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!node || !data) return null;

  const statusOptions = data.statuses ?? (data.status ? [data.status] : []);

  return (
    <aside className="glass-strong flex w-full flex-col border-[var(--border)] md:w-80 md:border-l shadow-surface-lg">
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

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save changes"}
            </Button>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>
        ) : (
          <div>
            <FieldLabel>Name</FieldLabel>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{data.label}</p>
          </div>
        )}

        {data.status && !editable && (
          <div>
            <FieldLabel>Status</FieldLabel>
            <Badge label={data.status.name} color={data.status.color} />
          </div>
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
      </div>
    </aside>
  );
}
