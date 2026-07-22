"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export interface HeaderMoreItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  onClick: () => void;
  active?: boolean;
}

function IconMore() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="3" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="13" cy="8" r="1.5" />
    </svg>
  );
}

/** Overflow menu for secondary header actions (zoom, theme, etc.). */
export function HeaderMoreMenu({
  items,
  label = "More",
}: {
  items: HeaderMoreItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <IconMore />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-[220px] overflow-hidden rounded-xl border border-[var(--border-strong)] glass-solid p-1 shadow-surface-lg"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                item.active
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                  : "text-zinc-700 hover:bg-black/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.06]"
              }`}
            >
              {item.icon ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/[0.04] text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-300">
                  {item.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.shortcut ? (
                <kbd className="shrink-0 rounded-md border border-[var(--border)] bg-black/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)] dark:bg-white/[0.05]">
                  {item.shortcut}
                </kbd>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
