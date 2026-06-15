"use client";

import { useState, useEffect, useCallback } from "react";
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
    <aside className="flex w-full flex-col border-[var(--border)] bg-[var(--panel)] md:w-80 md:border-l">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Details</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
            Type
          </p>
          <p className="text-sm capitalize text-zinc-700 dark:text-zinc-300">{data.type}</p>
        </div>

        {editable ? (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1 block">
                Name
              </label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {statusOptions.length > 0 && (
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1 block">
                  Status
                </label>
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
              <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1 block">
                Priority
              </label>
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
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Name
            </p>
            <p className="text-sm text-zinc-900 dark:text-zinc-100">{data.label}</p>
          </div>
        )}

        {data.status && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Status
            </p>
            <Badge label={data.status.name} color={data.status.color} />
          </div>
        )}

        {data.dueDate && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Due date
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {formatDate(data.dueDate)}
            </p>
          </div>
        )}

        {data.assignees && data.assignees.length > 0 && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-2">
              Assignees
            </p>
            <div className="space-y-2">
              {data.assignees.map((a) => (
                <div key={a.username} className="flex items-center gap-2">
                  <Avatar name={a.username} src={a.profilePicture} size={28} />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{a.username}</span>
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
            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Open in ClickUp ↗
          </a>
        )}
      </div>
    </aside>
  );
}
