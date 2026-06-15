"use client";

import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/ui/ThemeProvider";
import type { NodeRecord } from "@/types/mindmap";

interface MindMapToolbarProps {
  breadcrumbs: NodeRecord[];
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onCenterSelected: () => void;
}

export function MindMapToolbar({
  breadcrumbs,
  onZoomIn,
  onZoomOut,
  onFitView,
  onCenterSelected,
}: MindMapToolbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--panel)] px-4">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="shrink-0 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Odin Mindmap
        </h1>
        {breadcrumbs.length > 0 && (
          <nav className="hidden min-w-0 items-center gap-1 text-xs text-zinc-400 sm:flex">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1 min-w-0">
                {i > 0 && <span className="text-zinc-300 dark:text-zinc-600">/</span>}
                <span className="truncate max-w-[120px]">{crumb.data.label}</span>
              </span>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onZoomOut} title="Zoom out (-)">
          −
        </Button>
        <Button variant="ghost" size="sm" onClick={onZoomIn} title="Zoom in (+)">
          +
        </Button>
        <Button variant="ghost" size="sm" onClick={onFitView} title="Fit view (0)">
          Fit
        </Button>
        <Button variant="ghost" size="sm" onClick={onCenterSelected} title="Center selected (f)">
          Center
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? "☀" : "☾"}
        </Button>
      </div>
    </header>
  );
}
