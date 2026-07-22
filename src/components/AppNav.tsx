"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  return `shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold leading-none transition-colors xl:px-3 xl:py-2 ${
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

function SecondaryNavMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const secondaryActive = SECONDARY_NAV.some((item) => isNavActive(pathname, item));
  const activeSecondary = SECONDARY_NAV.find((item) => isNavActive(pathname, item));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={tabClass(secondaryActive)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>{activeSecondary?.label ?? "More"}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={`ml-1 inline-block opacity-70 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1.5 w-[180px] overflow-hidden rounded-xl border border-[var(--border-strong)] glass-solid p-1 shadow-surface-lg"
        >
          {SECONDARY_NAV.map((item) => {
            const active = isNavActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "text-zinc-700 hover:bg-black/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.06]"
                }`}
              >
                <span>{item.label}</span>
                {active ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-indigo-500">
                    <path d="M3 7l3 3 5-5.5" />
                  </svg>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
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
          className="mx-1 h-4 w-px shrink-0 bg-[var(--border-strong)]"
          aria-hidden
        />
        <div className="2xl:hidden">
          <SecondaryNavMenu pathname={pathname} />
        </div>
        <div className="hidden items-center gap-0.5 2xl:flex">
          <NavLinks items={SECONDARY_NAV} pathname={pathname} />
        </div>
      </nav>
    </>
  );
}
