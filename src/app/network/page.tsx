"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AppNav } from "@/components/AppNav";
import { useTheme } from "@/components/ui/ThemeProvider";
import { NetworkCanvas, useNetworkWorkspaces } from "@/components/network/NetworkCanvas";
import type { NetworkViewMode } from "@/types/network";

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

export default function NetworkPage() {
  const { theme, toggleTheme } = useTheme();
  const { workspaces, loading: wsLoading } = useNetworkWorkspaces();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<NetworkViewMode>("people");
  const [collabOnly, setCollabOnly] = useState(false);
  const [search, setSearch] = useState("");

  const activeTeamId = teamId ?? workspaces[0]?.id ?? null;

  return (
    <div className="flex h-screen flex-col">
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
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium text-[var(--muted)] sm:inline">
              Workspace
            </span>
            <select
              value={activeTeamId ?? ""}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={wsLoading || workspaces.length === 0}
              className="rounded-xl border border-[var(--border-strong)] bg-[var(--panel-solid)] px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm dark:text-zinc-200"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex rounded-xl border border-[var(--border-strong)] bg-[var(--panel-solid)] p-0.5">
            {(["people", "projects"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                  viewMode === mode
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "text-[var(--muted)] hover:text-zinc-700 dark:hover:text-zinc-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={collabOnly}
              onChange={(e) => setCollabOnly(e.target.checked)}
              className="rounded border-[var(--border-strong)] text-indigo-600 focus:ring-indigo-500/40"
            />
            <span className="hidden sm:inline">Only collaborations</span>
            <span className="sm:hidden">Collab</span>
          </label>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-28 py-1.5 text-xs sm:w-36"
          />

          <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {activeTeamId ? (
          <NetworkCanvas
            teamId={activeTeamId}
            viewMode={viewMode}
            search={search}
            collabOnly={collabOnly}
          />
        ) : (
          <div className="canvas-bg flex h-full items-center justify-center">
            <p className="text-sm font-medium text-[var(--muted)]">
              {wsLoading ? "Loading workspaces…" : "No workspace available"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
