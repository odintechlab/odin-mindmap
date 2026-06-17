"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { TabPageShell } from "@/components/layout/TabPageShell";
import { TabSkeleton } from "@/components/layout/TabSkeleton";
import { usePersistedWorkspace } from "@/hooks/usePersistedWorkspace";
import { fetchActivityStats } from "@/lib/activity/api";
import type { DashboardDateRange, DashboardProject } from "@/types/dashboard";
import type { ActivityStats } from "@/types/activity";

function ActivityContent({
  teamId,
  range,
  listId,
  onProjectsLoaded,
}: {
  teamId: string;
  range: DashboardDateRange;
  listId: string | null;
  onProjectsLoaded: (projects: DashboardProject[]) => void;
}) {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchActivityStats(teamId, range, listId)
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          onProjectsLoaded(data.projects);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load activity");
          setStats(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId, range, listId, onProjectsLoaded]);

  if (loading) return <TabSkeleton />;
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }
  if (!stats) return null;
  return <ActivityFeed stats={stats} />;
}

export default function ActivityPage() {
  const { workspaces, loading: wsLoading, activeTeamId, setTeamId } = usePersistedWorkspace();
  const [range, setRange] = useState<DashboardDateRange>("30d");
  const [listId, setListId] = useState<string | null>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);

  const onProjectsLoaded = useCallback((loaded: DashboardProject[]) => {
    setProjects(loaded);
  }, []);

  const handleTeamChange = (id: string) => {
    setTeamId(id);
    setListId(null);
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
      showRangeFilter
      range={range}
      onRangeChange={setRange}
    >
      <ActivityContent
        teamId={activeTeamId!}
        range={range}
        listId={listId}
        onProjectsLoaded={onProjectsLoaded}
      />
    </TabPageShell>
  );
}
