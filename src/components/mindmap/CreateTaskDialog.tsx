"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { MemberOption } from "./MindMapToolbar";

interface CreateTaskDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  members?: MemberOption[];
  onCreate: (args: { name: string; assigneeIds: number[] }) => Promise<void>;
}

export function CreateTaskDialog({
  title,
  open,
  onClose,
  onCreate,
  members = [],
}: CreateTaskDialogProps) {
  const [name, setName] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setAssigneeIds([]);
    setError(null);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a task name");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onCreate({ name: trimmed, assigneeIds });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const sortedMembers = [...members].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border-strong)] glass-solid p-5 shadow-surface-lg"
      >
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">Creates the task in ClickUp immediately.</p>

        <div className="mt-4">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Task name"
            disabled={saving}
          />
        </div>

        {sortedMembers.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              Assignees
            </p>
            <div className="max-h-40 overflow-auto rounded-xl border border-[var(--border-strong)] bg-[var(--panel-solid)] p-2">
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

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
