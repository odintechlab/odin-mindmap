"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function tabClass(active: boolean) {
  return `rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
    active
      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
      : "text-[var(--muted)] hover:text-zinc-700 dark:hover:text-zinc-200"
  }`;
}

export function AppNav() {
  const pathname = usePathname();
  const isMindmap = pathname === "/";
  const isNetwork = pathname.startsWith("/network");

  return (
    <nav className="flex items-center gap-0.5 rounded-xl border border-[var(--border-strong)] bg-[var(--panel-solid)] p-0.5">
      <Link href="/" className={tabClass(isMindmap)}>
        Mindmap
      </Link>
      <Link href="/network" className={tabClass(isNetwork)}>
        Network
      </Link>
    </nav>
  );
}
