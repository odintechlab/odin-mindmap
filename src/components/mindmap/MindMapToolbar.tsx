"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { AppNav } from "@/components/AppNav";
import { useTheme } from "@/components/ui/ThemeProvider";
import { StatusFilterDropdown } from "./StatusFilterDropdown";
import type { TaskStatusFilter } from "@/lib/mindmap/constants";
import type { NodeRecord } from "@/types/mindmap";

export type MindMapScope =
  | { mode: "all" }
  | { mode: "member"; teamId: string; userId: string; label: string; profilePicture?: string | null };

export interface MemberOption {
  teamId: string;
  userId: string;
  label: string;
  profilePicture?: string | null;
}

interface MindMapToolbarProps {
  breadcrumbs: NodeRecord[];
  statusFilter: TaskStatusFilter;
  onStatusFilterChange: (filter: TaskStatusFilter) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onCenterSelected: () => void;
  scope: MindMapScope;
  onScopeChange: (scope: MindMapScope) => void;
  adminUnlocked: boolean;
  onAdminUnlockedChange: (unlocked: boolean) => void;
  members: MemberOption[];
}

function IconZoomOut() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
      <path d="M5 7h4" />
    </svg>
  );
}

function IconZoomIn() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
      <path d="M5 7h4M7 5v4" />
    </svg>
  );
}

function IconFit() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3" />
    </svg>
  );
}

function IconCenter() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 9.5a5.5 5.5 0 01-7-7 5.5 5.5 0 107 7z" />
    </svg>
  );
}

function IconLock({ unlocked }: { unlocked: boolean }) {
  return unlocked ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7H4a2 2 0 00-2 2v3a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <path d="M5.5 7V5.5A2.5 2.5 0 018 3a2.5 2.5 0 012.5 2.5V7" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7H4a2 2 0 00-2 2v3a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <path d="M6 7V5.6A2.7 2.7 0 018.7 3c.8 0 1.5.3 2 .8" />
      <path d="M3 3l10 10" />
    </svg>
  );
}

function ScopeDropdown({
  scope,
  onChange,
  members,
}: {
  scope: MindMapScope;
  onChange: (s: MindMapScope) => void;
  members: MemberOption[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.label.toLowerCase().includes(q));
  }, [members, query]);

  const label = scope.mode === "all" ? "All" : scope.label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--panel-solid)] py-1.5 pl-2.5 pr-2 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-black/[0.03] dark:text-zinc-200 dark:hover:bg-white/[0.04]"
        title="Scope"
      >
        {scope.mode === "member" ? (
          <Avatar name={scope.label} src={scope.profilePicture} size={18} />
        ) : (
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2.5 3.5h9M2.5 7h9M2.5 10.5h9" />
            </svg>
          </span>
        )}
        <span className="max-w-[140px] truncate">{label}</span>
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
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[280px] overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--panel-solid)] p-2 shadow-surface-lg">
          <div className="px-1 pb-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              className="py-1.5 text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onChange({ mode: "all" });
              setOpen(false);
              setQuery("");
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
              scope.mode === "all"
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                : "text-zinc-700 hover:bg-black/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.06]"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2.5 3.5h9M2.5 7h9M2.5 10.5h9" />
              </svg>
            </span>
            <span className="flex-1">All</span>
            {scope.mode === "all" && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-indigo-500">
                <path d="M3 7l3 3 5-5.5" />
              </svg>
            )}
          </button>

          <div className="my-2 h-px bg-[var(--border)]" />

          <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
            {filtered.length === 0 ? (
              <p className="px-2.5 py-3 text-xs text-[var(--muted)]">No matches</p>
            ) : (
              filtered.map((m) => {
                const selected =
                  scope.mode === "member" &&
                  scope.teamId === m.teamId &&
                  scope.userId === m.userId;
                return (
                  <button
                    key={`${m.teamId}:${m.userId}`}
                    type="button"
                    onClick={() => {
                      onChange({
                        mode: "member",
                        teamId: m.teamId,
                        userId: m.userId,
                        label: m.label,
                        profilePicture: m.profilePicture,
                      });
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                      selected
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                        : "text-zinc-700 hover:bg-black/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <Avatar name={m.label} src={m.profilePicture} size={22} />
                    <span className="flex-1 truncate">{m.label}</span>
                    {selected && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-indigo-500">
                        <path d="M3 7l3 3 5-5.5" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MindMapToolbar({
  breadcrumbs,
  statusFilter,
  onStatusFilterChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  onCenterSelected,
  scope,
  onScopeChange,
  adminUnlocked,
  onAdminUnlockedChange,
  members,
}: MindMapToolbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const expectedPin =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_ADMIN_PIN ?? "1234")
      : "1234";

  useEffect(() => {
    if (!pinOpen) {
      setPin("");
      setPinError(null);
    }
  }, [pinOpen]);

  return (
    <header className="glass relative z-50 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] px-5">
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="3" fill="white" />
              <circle cx="8" cy="10" r="2" fill="white" fillOpacity="0.85" />
              <circle cx="24" cy="10" r="2" fill="white" fillOpacity="0.85" />
              <circle cx="8" cy="22" r="2" fill="white" fillOpacity="0.85" />
              <circle cx="24" cy="22" r="2" fill="white" fillOpacity="0.85" />
              <path d="M13 14L9 11M19 14L23 11M13 18L9 21M19 18L23 21" stroke="white" strokeOpacity="0.8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="shrink-0 text-sm font-bold tracking-tight text-gradient">
            Odin Mindmap
          </h1>
        </div>

        <div className="hidden h-4 w-px bg-[var(--border-strong)] sm:block" />
        <AppNav />

        {breadcrumbs.length > 0 && (
          <nav className="hidden min-w-0 items-center gap-1 text-xs text-[var(--muted)] sm:flex">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1 min-w-0">
                {i > 0 && <span className="text-[var(--border-strong)]">/</span>}
                <span className="truncate max-w-[120px] font-medium">{crumb.data.label}</span>
              </span>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-medium text-[var(--muted)] sm:inline">Scope</span>
          <ScopeDropdown
            scope={scope}
            onChange={onScopeChange}
            members={members}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-medium text-[var(--muted)] sm:inline">Status</span>
          <StatusFilterDropdown value={statusFilter} onChange={onStatusFilterChange} />
        </div>

        <div className="flex items-center gap-0.5">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (adminUnlocked) {
                onAdminUnlockedChange(false);
                return;
              }
              setPinOpen((v) => !v);
            }}
            title={adminUnlocked ? "Lock admin" : "Unlock admin"}
          >
            <IconLock unlocked={adminUnlocked} />
          </Button>

          {pinOpen && !adminUnlocked && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-[240px] overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--panel-solid)] p-2 shadow-surface-lg">
              <p className="px-1 pb-2 text-xs font-medium text-zinc-700 dark:text-zinc-200">
                Enter admin PIN
              </p>
              <div className="px-1 space-y-2">
                <Input
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="PIN"
                  type="password"
                  className="py-1.5 text-xs"
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (pin === expectedPin) {
                      onAdminUnlockedChange(true);
                      setPinOpen(false);
                    } else {
                      setPinError("Wrong PIN");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (pin === expectedPin) {
                      onAdminUnlockedChange(true);
                      setPinOpen(false);
                    } else {
                      setPinError("Wrong PIN");
                    }
                  }}
                >
                  Unlock
                </Button>
                {pinError && <p className="text-[11px] text-red-500 px-0.5">{pinError}</p>}
                <p className="text-[11px] text-[var(--muted)] px-0.5">
                  Unlock enables People + Me-only mode.
                </p>
              </div>
            </div>
          )}
        </div>

        <Button variant="ghost" size="icon" onClick={onZoomOut} title="Zoom out (-)">
          <IconZoomOut />
        </Button>
        <Button variant="ghost" size="icon" onClick={onZoomIn} title="Zoom in (+)">
          <IconZoomIn />
        </Button>
        <div className="mx-1 h-4 w-px bg-[var(--border-strong)]" />
        <Button variant="ghost" size="icon" onClick={onFitView} title="Fit view (0)">
          <IconFit />
        </Button>
        <Button variant="ghost" size="icon" onClick={onCenterSelected} title="Center selected (f)">
          <IconCenter />
        </Button>
        <div className="mx-1 h-4 w-px bg-[var(--border-strong)]" />
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </Button>
        </div>
      </div>
    </header>
  );
}
