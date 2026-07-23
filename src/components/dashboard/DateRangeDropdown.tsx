"use client";

import { useEffect, useRef, useState } from "react";
import { headerDropdownTriggerClass } from "@/components/layout/AppHeader";

export type DateRangePreset = "all" | "30d" | "quarter" | "year" | "custom";

export interface DateRangeSelection {
  preset: DateRangePreset;
  /** YYYY-MM-DD, empty when preset is "all" */
  from: string;
  /** YYYY-MM-DD, empty when preset is "all" */
  to: string;
}

export const ALL_TIME_RANGE: DateRangeSelection = {
  preset: "all",
  from: "",
  to: "",
};

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const PRESETS: {
  id: Exclude<DateRangePreset, "custom">;
  label: string;
  compute: (today: Date) => { from: string; to: string };
}[] = [
  { id: "all", label: "All time", compute: () => ({ from: "", to: "" }) },
  {
    id: "30d",
    label: "Last 30 days",
    compute: (today) => ({
      from: toIsoDate(new Date(today.getTime() - 29 * 86_400_000)),
      to: toIsoDate(today),
    }),
  },
  {
    id: "quarter",
    label: "This quarter",
    compute: (today) => ({
      from: toIsoDate(
        new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1),
      ),
      to: toIsoDate(today),
    }),
  },
  {
    id: "year",
    label: "This year",
    compute: (today) => ({
      from: toIsoDate(new Date(today.getFullYear(), 0, 1)),
      to: toIsoDate(today),
    }),
  },
];

function parseIsoDate(value: string): Date | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Jan 1 – Jun 30, 2026" (from-year shown only when it differs) */
export function formatRangeLabel(from: string, to: string): string {
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  if (!fromDate || !toDate) return "Custom range";
  const sameYear = fromDate.getFullYear() === toDate.getFullYear();
  const fromLabel = fromDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const toLabel = toDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fromLabel} – ${toLabel}`;
}

export function selectionLabel(value: DateRangeSelection): string {
  if (value.preset === "all") return "All time";
  if (value.preset === "custom") return formatRangeLabel(value.from, value.to);
  const preset = PRESETS.find((p) => p.id === value.preset);
  if (value.from && value.to) {
    return `${preset?.label ?? "Period"} · ${formatRangeLabel(value.from, value.to)}`;
  }
  return preset?.label ?? "All time";
}

function IconCalendar() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      className="shrink-0 text-[var(--muted)]"
      aria-hidden
    >
      <rect x="1.5" y="2.5" width="11" height="10" rx="2" />
      <path d="M1.5 5.5h11M4.5 1.25v2.5M9.5 1.25v2.5" />
    </svg>
  );
}

const panelInputClass =
  "w-full rounded-lg border border-[var(--border-strong)] bg-transparent px-2 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:border-indigo-400 dark:text-zinc-200 dark:[color-scheme:dark]";

interface DateRangeDropdownProps {
  value: DateRangeSelection;
  onChange: (value: DateRangeSelection) => void;
}

export function DateRangeDropdown({ value, onChange }: DateRangeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(value.from);
  const [draftTo, setDraftTo] = useState(value.to);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Keep custom From/To in sync with the active selection (presets autofill these).
  useEffect(() => {
    setDraftFrom(value.from);
    setDraftTo(value.to);
  }, [value.from, value.to]);

  const toggleOpen = () => setOpen((v) => !v);

  const customValid =
    draftFrom !== "" && draftTo !== "" && draftFrom <= draftTo;

  const applyCustom = () => {
    if (!customValid) return;
    onChange({ preset: "custom", from: draftFrom, to: draftTo });
    setOpen(false);
  };

  const selectPreset = (preset: (typeof PRESETS)[number]) => {
    const { from, to } = preset.compute(new Date());
    setDraftFrom(from);
    setDraftTo(to);
    onChange({ preset: preset.id, from, to });
    // Keep open so the autofilled From/To are visible for confirmation.
  };

  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={toggleOpen}
        className={`${headerDropdownTriggerClass} w-full max-w-[16rem] sm:w-auto`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Filter by period"
      >
        <IconCalendar />
        <span className="min-w-0 flex-1 truncate text-left sm:flex-initial">
          {selectionLabel(value)}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={`shrink-0 text-[var(--muted)] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[248px] overflow-hidden rounded-xl border border-[var(--border-strong)] glass-solid p-1 shadow-surface-lg">
          {PRESETS.map((preset) => {
            const selected = value.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => selectPreset(preset)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                  selected
                    ? "!bg-indigo-50 text-indigo-700 dark:!bg-indigo-950/50 dark:text-indigo-300"
                    : "text-zinc-700 hover:!bg-black/[0.04] dark:text-zinc-200 dark:hover:!bg-white/[0.06]"
                }`}
              >
                <span className="flex-1">{preset.label}</span>
                {selected && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="shrink-0 text-indigo-500"
                    aria-hidden
                  >
                    <path d="M3 7l3 3 5-5.5" />
                  </svg>
                )}
              </button>
            );
          })}

          <div className="mx-1.5 my-1 border-t border-[var(--border)]" aria-hidden />

          <div className="px-2.5 pb-2 pt-1.5">
            <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Custom range
            </p>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2">
                <span className="w-9 shrink-0 text-[0.6875rem] font-medium text-[var(--muted)]">
                  From
                </span>
                <input
                  type="date"
                  value={draftFrom}
                  max={draftTo || undefined}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className={panelInputClass}
                  aria-label="Custom range start"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-9 shrink-0 text-[0.6875rem] font-medium text-[var(--muted)]">
                  To
                </span>
                <input
                  type="date"
                  value={draftTo}
                  min={draftFrom || undefined}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className={panelInputClass}
                  aria-label="Custom range end"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={applyCustom}
              disabled={!customValid}
              className="mt-2.5 w-full rounded-lg !bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:!bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
