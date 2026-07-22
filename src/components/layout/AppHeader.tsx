"use client";

import { AppNav } from "@/components/AppNav";

export function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
        <svg width="15" height="15" viewBox="0 0 32 32" fill="none" aria-hidden>
          <circle cx="16" cy="16" r="3" fill="white" />
          <circle cx="8" cy="10" r="2" fill="white" fillOpacity="0.85" />
          <circle cx="24" cy="10" r="2" fill="white" fillOpacity="0.85" />
          <circle cx="8" cy="22" r="2" fill="white" fillOpacity="0.85" />
          <circle cx="24" cy="22" r="2" fill="white" fillOpacity="0.85" />
          <path
            d="M13 14L9 11M19 14L23 11M13 18L9 21M19 18L23 21"
            stroke="white"
            strokeOpacity="0.8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {!compact && (
        <h1 className="hidden shrink-0 text-sm font-bold tracking-tight text-gradient sm:inline sm:text-[0.9375rem]">
          Odin Mindmap
        </h1>
      )}
    </div>
  );
}

/** Shared shell styling for the app header */
export const appHeaderClass =
  "safe-top glass sticky top-0 z-[100] shrink-0 overflow-visible border-b border-[var(--border)] px-4 py-3 sm:px-5 lg:px-6 lg:py-2.5";

/** @deprecated Prefer the slot-based AppHeader layout */
export const appHeaderDesktopRowClass = "hidden min-w-0 items-center gap-3 lg:flex";

/** Shared select styling for header controls */
export const headerSelectClass =
  "glass-solid min-h-[2.5rem] w-full min-w-0 truncate rounded-xl border border-[var(--border-strong)] px-3 py-2 text-xs font-medium leading-none text-zinc-700 shadow-sm dark:text-zinc-200 sm:w-auto sm:min-w-[9.5rem] lg:min-h-[2.25rem] lg:max-w-[11rem] lg:px-2.5 lg:py-1.5";

/** Compact trigger for header dropdowns — matches select height on desktop */
export const headerDropdownTriggerClass =
  "glass-solid flex min-h-[2.5rem] items-center gap-2 rounded-xl border border-[var(--border-strong)] px-2.5 py-1.5 text-xs font-medium leading-none text-zinc-700 shadow-sm transition-colors hover:bg-black/[0.03] dark:text-zinc-200 dark:hover:bg-white/[0.06] lg:min-h-[2.25rem]";

/** Groups related filters into one compact cluster */
export function HeaderContextGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 lg:flex-nowrap lg:gap-1 lg:rounded-xl lg:border lg:border-[var(--border-strong)] lg:bg-[color-mix(in_srgb,var(--panel-solid)_88%,transparent)] lg:p-1 lg:shadow-sm [&_select]:lg:border-0 [&_select]:lg:bg-transparent [&_select]:lg:shadow-none [&_button]:lg:border-0 [&_button]:lg:bg-transparent [&_button]:lg:shadow-none [&_button]:lg:min-h-[2rem]">
      {children}
    </div>
  );
}

/** Wrapper for a labeled header control (Workspace, Project, etc.) */
export function HeaderControl({
  label,
  children,
  className = "",
  grouped = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  grouped?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 w-full items-center gap-2 sm:w-auto ${
        grouped ? "lg:px-0.5" : ""
      } ${className}`}
    >
      <span className="sr-only">{label}</span>
      <span
        className="hidden shrink-0 text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--muted)] xl:inline"
        aria-hidden
      >
        {label}
      </span>
      <div className="min-w-0 flex-1 sm:flex-initial">{children}</div>
    </div>
  );
}

/** Icon-only actions cluster */
export function HeaderActions({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 items-center gap-0.5">{children}</div>;
}

interface AppHeaderProps {
  /** Context filters (workspace, scope, status, project, range) */
  filters?: React.ReactNode;
  /** Primary icon actions (admin lock, overflow menu, theme) */
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  /**
   * Legacy single-slot API — prefer `filters` + `actions`.
   * When provided without filters/actions, rendered in the filters area.
   */
  controls?: React.ReactNode;
}

export function AppHeader({
  filters,
  actions,
  breadcrumbs,
  controls,
}: AppHeaderProps) {
  const filterContent = filters ?? controls;
  const breadcrumbNav = breadcrumbs ? (
    <nav className="flex min-w-0 items-center gap-1 text-xs text-[var(--muted)]">
      {breadcrumbs}
    </nav>
  ) : null;

  return (
    <header className={appHeaderClass}>
      {/* Mobile & tablet */}
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="flex items-center gap-3">
          <AppLogo compact />
          <div className="min-w-0 flex-1">
            <AppNav />
          </div>
          {actions ? <HeaderActions>{actions}</HeaderActions> : null}
        </div>

        {breadcrumbNav}

        {filterContent ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {filterContent}
          </div>
        ) : null}
      </div>

      {/* Desktop */}
      <div className="hidden min-w-0 items-center gap-3 lg:flex">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <AppLogo />
          <div className="h-5 w-px shrink-0 bg-[var(--border-strong)]" aria-hidden />
          <AppNav />
          {breadcrumbNav ? (
            <>
              <div className="h-5 w-px shrink-0 bg-[var(--border-strong)]" aria-hidden />
              <div className="min-w-0">{breadcrumbNav}</div>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 xl:gap-2.5">
          {filterContent}
          {actions ? <HeaderActions>{actions}</HeaderActions> : null}
        </div>
      </div>
    </header>
  );
}
