"use client";

import { useEffect, useState } from "react";
import {
  AppHeader,
  HeaderContextGroup,
  HeaderControl,
  headerSelectClass,
} from "@/components/layout/AppHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import {
  ALL_TIME_RANGE,
  DateRangeDropdown,
  type DateRangeSelection,
} from "@/components/dashboard/DateRangeDropdown";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/ui/ThemeProvider";
import { usePersistedWorkspace } from "@/hooks/usePersistedWorkspace";
import { fetchDashboardStats } from "@/lib/dashboard/api";
import type { DashboardProject, DashboardStats } from "@/types/dashboard";

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

function DashboardContent({
  teamId,
  listId,
  from,
  to,
  onProjectsLoaded,
  onStatsLoaded,
}: {
  teamId: string;
  listId: string | null;
  from: string;
  to: string;
  onProjectsLoaded: (projects: DashboardProject[]) => void;
  onStatsLoaded: (stats: DashboardStats | null) => void;
}) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    onStatsLoaded(null);

    const rangeFrom = from && to ? from : null;
    const rangeTo = from && to ? to : null;

    fetchDashboardStats(teamId, "30d", listId, rangeFrom, rangeTo)
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          onProjectsLoaded(data.projects);
          onStatsLoaded(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
          setStats(null);
          onStatsLoaded(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId, listId, from, to, onProjectsLoaded, onStatsLoaded]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-red-200/60 bg-red-50/80 px-5 py-2.5 text-sm text-red-700 backdrop-blur-sm dark:border-red-900/40 dark:bg-red-950/50 dark:text-red-300">
          <span className="font-medium">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            Dismiss
          </button>
        </div>
        <div className="canvas-bg flex flex-1 items-center justify-center">
          <p className="text-sm text-[var(--muted)]">Unable to load dashboard data.</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return <DashboardGrid stats={stats} />;
}

export default function DashboardPage() {
  const { theme, toggleTheme } = useTheme();
  const { workspaces, loading: wsLoading, activeTeamId, setTeamId } = usePersistedWorkspace();
  const [listId, setListId] = useState<string | null>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeSelection>(ALL_TIME_RANGE);
  const [exportStats, setExportStats] = useState<DashboardStats | null>(null);

  const handleTeamChange = (id: string) => {
    setTeamId(id);
    setListId(null);
    setProjects([]);
    setExportStats(null);
  };

  const projectName = listId
    ? projects.find((p) => p.id === listId)?.name ?? null
    : null;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <AppHeader
        filters={
          <HeaderContextGroup>
            <HeaderControl label="Workspace" grouped>
              <select
                value={activeTeamId ?? ""}
                onChange={(e) => handleTeamChange(e.target.value)}
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

            <HeaderControl label="Project" grouped>
              <select
                value={listId ?? ""}
                onChange={(e) => setListId(e.target.value || null)}
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

            <HeaderControl label="Period" grouped>
              <DateRangeDropdown value={dateRange} onChange={setDateRange} />
            </HeaderControl>
          </HeaderContextGroup>
        }
        actions={
          <>
            <ExportPdfButton
              stats={exportStats}
              projectName={projectName}
              disabled={!exportStats}
            />
            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? <IconSun /> : <IconMoon />}
            </Button>
          </>
        }
      />

      <div className="canvas-bg safe-bottom min-h-0 flex-1">
        {activeTeamId ? (
          <DashboardContent
            teamId={activeTeamId}
            listId={listId}
            from={dateRange.from}
            to={dateRange.to}
            onProjectsLoaded={setProjects}
            onStatsLoaded={setExportStats}
          />
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
