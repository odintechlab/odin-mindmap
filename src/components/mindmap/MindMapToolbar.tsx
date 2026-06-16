"use client";

import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/ui/ThemeProvider";
import { StatusFilterDropdown } from "./StatusFilterDropdown";
import type { TaskStatusFilter } from "@/lib/mindmap/constants";
import type { NodeRecord } from "@/types/mindmap";

interface MindMapToolbarProps {
  breadcrumbs: NodeRecord[];
  statusFilter: TaskStatusFilter;
  onStatusFilterChange: (filter: TaskStatusFilter) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onCenterSelected: () => void;
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

export function MindMapToolbar({
  breadcrumbs,
  statusFilter,
  onStatusFilterChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  onCenterSelected,
}: MindMapToolbarProps) {
  const { theme, toggleTheme } = useTheme();

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
          <span className="hidden text-xs font-medium text-[var(--muted)] sm:inline">Status</span>
          <StatusFilterDropdown value={statusFilter} onChange={onStatusFilterChange} />
        </div>

        <div className="flex items-center gap-0.5">
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
