"use client";

import { useEffect, useRef, useState } from "react";
import { STATUS_FILTER_OPTIONS, type TaskStatusFilter } from "@/lib/mindmap/constants";

interface StatusFilterDropdownProps {
  value: TaskStatusFilter;
  onChange: (value: TaskStatusFilter) => void;
}

function StatusIcon({ filter, color }: { filter: TaskStatusFilter; color: string }) {
  switch (filter) {
    case "all":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="3.5" cy="3.5" r="1.5" fill={color} />
          <circle cx="10.5" cy="3.5" r="1.5" fill={color} />
          <circle cx="3.5" cy="10.5" r="1.5" fill={color} />
          <circle cx="10.5" cy="10.5" r="1.5" fill={color} />
        </svg>
      );
    case "open":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke={color} strokeWidth="2" />
        </svg>
      );
    case "custom":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke={color} strokeWidth="2" />
          <path d="M7 7V2" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="7" cy="7" r="1.5" fill={color} />
        </svg>
      );
    case "closed":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" fill={color} />
          <path d="M4.5 7l2 2 3-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export function StatusFilterDropdown({ value, onChange }: StatusFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = STATUS_FILTER_OPTIONS.find((o) => o.value === value)!;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--panel-solid)] py-1.5 pl-2.5 pr-2 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-black/[0.03] dark:text-zinc-200 dark:hover:bg-white/[0.04]"
      >
        <StatusIcon filter={value} color={current.color} />
        <span>{current.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={`text-[var(--muted)] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[168px] overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--panel-solid)] p-1 shadow-surface-lg">
          {STATUS_FILTER_OPTIONS.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                  selected
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "text-zinc-700 hover:bg-black/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.06]"
                }`}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${opt.color}18` }}
                >
                  <StatusIcon filter={opt.value} color={opt.color} />
                </span>
                <span className="flex-1">{opt.label}</span>
                {selected && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-indigo-500">
                    <path d="M3 7l3 3 5-5.5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
