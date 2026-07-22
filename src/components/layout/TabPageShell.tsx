"use client";

import {
  AppHeader,
  HeaderContextGroup,
  HeaderControl,
  headerSelectClass,
} from "@/components/layout/AppHeader";
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
    <div className="flex min-h-[100dvh] flex-col">
      <AppHeader
        filters={
          <>
            <HeaderContextGroup>
              <HeaderControl label="Workspace" grouped>
                <select
                  value={activeTeamId ?? ""}
                  onChange={(e) => onTeamChange(e.target.value)}
                  disabled={wsLoading || workspaces.length === 0}
                  className={headerSelectClass}
                  aria-label="Workspace"
                >
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </HeaderControl>

              {showProjectFilter && onListIdChange && (
                <HeaderControl label="Project" grouped>
                  <select
                    value={listId ?? ""}
                    onChange={(e) => onListIdChange(e.target.value || null)}
                    disabled={!activeTeamId || projects.length === 0}
                    className={headerSelectClass}
                    aria-label="Project"
                  >
                    <option value="">All projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.taskCount})
                      </option>
                    ))}
                  </select>
                </HeaderControl>
              )}
            </HeaderContextGroup>

            {showRangeFilter && onRangeChange && (
              <div className="glass-solid flex rounded-xl border border-[var(--border-strong)] p-0.5">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onRangeChange(opt.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
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
          </>
        }
        actions={
          <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </Button>
        }
      />

      <div className="canvas-bg safe-bottom min-h-0 flex-1">
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
