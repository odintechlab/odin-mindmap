"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  return `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold leading-none transition-colors xl:px-3 xl:py-2 ${
    active ? tabActive : tabIdle
  }`;
}

function IconMindmap() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="2" fill="currentColor" />
      <circle cx="3" cy="4" r="1.5" fill="currentColor" fillOpacity="0.85" />
      <circle cx="13" cy="4" r="1.5" fill="currentColor" fillOpacity="0.85" />
      <circle cx="3" cy="12" r="1.5" fill="currentColor" fillOpacity="0.85" />
      <circle cx="13" cy="12" r="1.5" fill="currentColor" fillOpacity="0.85" />
      <path
        d="M6.2 6.8L4.2 5M9.8 6.8L11.8 5M6.2 9.2L4.2 11M9.8 9.2L11.8 11"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
      <circle cx="8" cy="3.5" r="1.75" />
      <circle cx="3.5" cy="12" r="1.75" />
      <circle cx="12.5" cy="12" r="1.75" />
      <path d="M8 5.3v2.2M8 7.5L4.8 10.4M8 7.5l3.2 2.9" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="5.5" height="5.5" rx="1.2" />
      <rect x="8.5" y="2" width="5.5" height="3.5" rx="1.2" />
      <rect x="8.5" y="7" width="5.5" height="7" rx="1.2" />
      <rect x="2" y="9" width="5.5" height="5" rx="1.2" />
    </svg>
  );
}

function IconTimeline() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
      <path d="M2 8h12" />
      <circle cx="4" cy="8" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconPortfolio() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 5.5h11v7a1.5 1.5 0 01-1.5 1.5h-8a1.5 1.5 0 01-1.5-1.5v-7z" />
      <path d="M5.5 5.5V4a1.5 1.5 0 011.5-1.5h2A1.5 1.5 0 0110.5 4v1.5" />
      <path d="M2.5 8.5h11" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 8h2.5l1.5-4 2.5 8 1.5-4H14" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="3.5" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="12.5" cy="8" r="1.25" />
    </svg>
  );
}

const NAV_ICONS: Record<string, ReactNode> = {
  "/mindmap": <IconMindmap />,
  "/network": <IconNetwork />,
  "/dashboard": <IconDashboard />,
  "/timeline": <IconTimeline />,
  "/portfolio": <IconPortfolio />,
  "/activity": <IconActivity />,
};

function NavLabel({ item }: { item: NavItem }) {
  return (
    <>
      <span className="opacity-90">{NAV_ICONS[item.href]}</span>
      <span>{item.label}</span>
    </>
  );
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
          <NavLabel item={item} />
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
        {activeSecondary ? (
          <NavLabel item={activeSecondary} />
        ) : (
          <>
            <span className="opacity-90">
              <IconMore />
            </span>
            <span>More</span>
          </>
        )}
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={`opacity-70 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1.5 w-[200px] overflow-hidden rounded-xl border border-[var(--border-strong)] glass-solid p-1 shadow-surface-lg"
        >
          {SECONDARY_NAV.map((item) => {
            const active = isNavActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "text-zinc-700 hover:bg-black/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.06]"
                }`}
              >
                <span className="opacity-90">{NAV_ICONS[item.href]}</span>
                <span className="flex-1">{item.label}</span>
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
