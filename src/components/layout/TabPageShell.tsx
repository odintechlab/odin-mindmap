"use client";

import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/ui/ThemeProvider";
import type { DashboardDateRange, DashboardProject } from "@/types/dashboard";

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

const RANGE_OPTIONS: { value: DashboardDateRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

interface TabPageShellProps {
  children: React.ReactNode;
  activeTeamId: string | null;
  workspaces: { id: string; label: string }[];
  wsLoading: boolean;
  onTeamChange: (id: string) => void;
  showProjectFilter?: boolean;
  projects?: DashboardProject[];
  listId?: string | null;
  onListIdChange?: (id: string | null) => void;
  showRangeFilter?: boolean;
  range?: DashboardDateRange;
  onRangeChange?: (range: DashboardDateRange) => void;
}

export function TabPageShell({
  children,
  activeTeamId,
  workspaces,
  wsLoading,
  onTeamChange,
  showProjectFilter = false,
  projects = [],
  listId = null,
  onListIdChange,
  showRangeFilter = false,
  range = "30d",
  onRangeChange,
}: TabPageShellProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen flex-col">
      <header className="glass relative z-50 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <div className="flex shrink-0 items-center gap-2.5">
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

          <div className="hidden h-4 w-px shrink-0 bg-[var(--border-strong)] sm:block" />
          <div className="min-w-0 flex-1 overflow-x-auto">
            <AppNav />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium text-[var(--muted)] sm:inline">
              Workspace
            </span>
            <select
              value={activeTeamId ?? ""}
              onChange={(e) => onTeamChange(e.target.value)}
              disabled={wsLoading || workspaces.length === 0}
              className="glass-solid max-w-[8rem] rounded-xl border border-[var(--border-strong)] px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm dark:text-zinc-200 sm:max-w-none"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          {showProjectFilter && onListIdChange && (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-medium text-[var(--muted)] sm:inline">
                Project
              </span>
              <select
                value={listId ?? ""}
                onChange={(e) => onListIdChange(e.target.value || null)}
                disabled={!activeTeamId || projects.length === 0}
                className="glass-solid max-w-[8rem] rounded-xl border border-[var(--border-strong)] px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm dark:text-zinc-200 sm:max-w-[14rem]"
              >
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.taskCount})
                  </option>
                ))}
              </select>
            </div>
          )}

          {showRangeFilter && onRangeChange && (
            <div className="glass-solid flex rounded-xl border border-[var(--border-strong)] p-0.5">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onRangeChange(opt.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    range === opt.value
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                      : "text-[var(--muted)] hover:text-zinc-700 dark:hover:text-zinc-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </Button>
        </div>
      </header>

      <div className="canvas-bg min-h-0 flex-1">
        {activeTeamId ? (
          children
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm font-medium text-[var(--muted)]">
              {wsLoading ? "Loading workspaces…" : "No workspace available"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
