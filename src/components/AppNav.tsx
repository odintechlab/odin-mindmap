"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { headerSelectClass } from "@/components/layout/AppHeader";
import {
  ALL_NAV,
  PRIMARY_NAV,
  SECONDARY_NAV,
  isNavActive,
  type NavItem,
} from "@/lib/navigation";

const tabActive =
  "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300";
const tabIdle =
  "text-[var(--muted)] hover:text-zinc-700 dark:hover:text-zinc-200";

function tabClass(active: boolean) {
  return `shrink-0 rounded-lg px-3 py-2 text-xs font-semibold leading-none transition-colors ${
    active ? tabActive : tabIdle
  }`;
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={tabClass(isNavActive(pathname, item))}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  const activeHref = useMemo(
    () => ALL_NAV.find((item) => isNavActive(pathname, item))?.href ?? "/mindmap",
    [pathname],
  );

  return (
    <>
      <select
        value={activeHref}
        onChange={(e) => router.push(e.target.value)}
        className={`${headerSelectClass} lg:hidden`}
        aria-label="Navigate"
      >
        {ALL_NAV.map((item) => (
          <option key={item.href} value={item.href}>
            {item.label}
          </option>
        ))}
      </select>

      <nav
        aria-label="Main"
        className="hidden min-w-0 items-center gap-0.5 overflow-visible whitespace-nowrap lg:flex"
      >
        <NavLinks items={PRIMARY_NAV} pathname={pathname} />
        <div
          className="mx-1.5 h-4 w-px shrink-0 bg-[var(--border-strong)]"
          aria-hidden
        />
        <NavLinks items={SECONDARY_NAV} pathname={pathname} />
      </nav>
    </>
  );
}
