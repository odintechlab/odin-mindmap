"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function tabClass(active: boolean) {
  return `shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
    active
      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
      : "text-[var(--muted)] hover:text-zinc-700 dark:hover:text-zinc-200"
  }`;
}

export function AppNav() {
  const pathname = usePathname();
  const isMindmap = pathname === "/mindmap" || pathname === "/";
  const isNetwork = pathname.startsWith("/network");
  const isDashboard = pathname.startsWith("/dashboard");
  const isTimeline = pathname.startsWith("/timeline");
  const isPortfolio = pathname.startsWith("/portfolio");
  const isActivity = pathname.startsWith("/activity");

  return (
    <nav className="glass-solid flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-[var(--border-strong)] p-0.5 whitespace-nowrap">
      <Link href="/mindmap" className={tabClass(isMindmap)}>
        Mindmap
      </Link>
      <Link href="/network" className={tabClass(isNetwork)}>
        Network
      </Link>
      <Link href="/dashboard" className={tabClass(isDashboard)}>
        Dashboard
      </Link>
      <Link href="/timeline" className={tabClass(isTimeline)}>
        Timeline
      </Link>
      <Link href="/portfolio" className={tabClass(isPortfolio)}>
        Portfolio
      </Link>
      <Link href="/activity" className={tabClass(isActivity)}>
        Activity
      </Link>
    </nav>
  );
}
