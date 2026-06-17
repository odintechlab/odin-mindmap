"use client";

import { useCallback, useEffect, useState } from "react";
import { TimelineCanvas } from "@/components/timeline/TimelineCanvas";
import { TabPageShell } from "@/components/layout/TabPageShell";
import { TabSkeleton } from "@/components/layout/TabSkeleton";
import { usePersistedWorkspace } from "@/hooks/usePersistedWorkspace";
import { fetchTimelineStats } from "@/lib/timeline/api";
import type { DashboardProject } from "@/types/dashboard";
import type { TimelineGroupBy, TimelineStats } from "@/types/timeline";

function TimelineContent({
  teamId,
  listId,
  assigneeId,
  groupBy,
  onProjectsLoaded,
}: {
  teamId: string;
  listId: string | null;
  assigneeId: number | null;
  groupBy: TimelineGroupBy;
  onProjectsLoaded: (projects: DashboardProject[]) => void;
}) {
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTimelineStats(teamId, { listId, assigneeId, groupBy })
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          onProjectsLoaded(
            data.projects.map((p) => ({ id: p.id, name: p.name, taskCount: 0 })),
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load timeline");
          setStats(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId, listId, assigneeId, groupBy, onProjectsLoaded]);

  if (loading) return <TabSkeleton />;
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }
  if (!stats) return null;
  return <TimelineCanvas stats={stats} />;
}

export default function TimelinePage() {
  const { workspaces, loading: wsLoading, activeTeamId, setTeamId } = usePersistedWorkspace();
  const [listId, setListId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [groupBy, setGroupBy] = useState<TimelineGroupBy>("list");
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [assignees, setAssignees] = useState<{ id: number; name: string }[]>([]);

  const onProjectsLoaded = useCallback((loaded: DashboardProject[]) => {
    setProjects(loaded);
  }, []);

  useEffect(() => {
    if (!activeTeamId) return;
    fetchTimelineStats(activeTeamId, { listId: null, groupBy: "list" })
      .then((data) => setAssignees(data.assignees))
      .catch(() => setAssignees([]));
  }, [activeTeamId]);

  const handleTeamChange = (id: string) => {
    setTeamId(id);
    setListId(null);
    setAssigneeId(null);
    setProjects([]);
  };

  return (
    <TabPageShell
      activeTeamId={activeTeamId}
      workspaces={workspaces}
      wsLoading={wsLoading}
      onTeamChange={handleTeamChange}
      showProjectFilter
      projects={projects}
      listId={listId}
      onListIdChange={setListId}
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-4 py-2">
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
            Group by
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as TimelineGroupBy)}
              className="glass-solid rounded-lg border border-[var(--border-strong)] px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200"
            >
              <option value="list">List</option>
              <option value="folder">Folder</option>
              <option value="space">Space</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
            Assignee
            <select
              value={assigneeId ?? ""}
              onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : null)}
              className="glass-solid rounded-lg border border-[var(--border-strong)] px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200"
            >
              <option value="">All</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="min-h-0 flex-1">
          {activeTeamId && (
            <TimelineContent
              teamId={activeTeamId}
              listId={listId}
              assigneeId={assigneeId}
              groupBy={groupBy}
              onProjectsLoaded={onProjectsLoaded}
            />
          )}
        </div>
      </div>
    </TabPageShell>
  );
}
