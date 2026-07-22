"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  AppHeader,
  HeaderContextGroup,
  HeaderControl,
  headerSelectClass,
} from "@/components/layout/AppHeader";
import { useTheme } from "@/components/ui/ThemeProvider";
import { usePersistedWorkspace } from "@/hooks/usePersistedWorkspace";
import { NetworkCanvas } from "@/components/network/NetworkCanvas";
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
  const { workspaces, loading: wsLoading, activeTeamId, setTeamId } = usePersistedWorkspace();
  const [viewMode, setViewMode] = useState<NetworkViewMode>("people");
  const [collabOnly, setCollabOnly] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <AppHeader
        filters={
          <>
            <HeaderContextGroup>
              <HeaderControl label="Workspace" grouped>
                <select
                  value={activeTeamId ?? ""}
                  onChange={(e) => setTeamId(e.target.value)}
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
            </HeaderContextGroup>

            <div className="flex shrink-0 items-center gap-2">
              <div className="glass-solid flex rounded-xl border border-[var(--border-strong)] p-0.5">
                {(["people", "projects"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                      viewMode === mode
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                        : "text-[var(--muted)] hover:text-zinc-700 dark:hover:text-zinc-200"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={collabOnly}
                  onChange={(e) => setCollabOnly(e.target.checked)}
                  className="rounded border-[var(--border-strong)] text-indigo-600 focus:ring-indigo-500/40"
                />
                <span className="hidden sm:inline">Only collaborations</span>
                <span className="sm:hidden">Collab</span>
              </label>
            </div>

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="min-w-0 w-full py-2 text-xs sm:w-36"
            />
          </>
        }
        actions={
          <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </Button>
        }
      />

      <div className="canvas-bg safe-bottom flex min-h-0 flex-1 flex-col">
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
