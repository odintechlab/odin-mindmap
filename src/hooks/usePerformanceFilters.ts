"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ALL_TIME_RANGE,
  selectionForPreset,
  thisMonthRange,
  type DateRangePreset,
  type DateRangeSelection,
} from "@/components/dashboard/DateRangeDropdown";
import { performanceQuery } from "@/lib/people/api";

const PRESETS: DateRangePreset[] = [
  "all",
  "30d",
  "month",
  "quarter",
  "year",
  "custom",
];

/** Remember performance period across visits for a week. */
export const PERFORMANCE_RANGE_STORAGE_KEY = "odin_performance_date_range";
const PERFORMANCE_RANGE_TTL_MS = 7 * 86_400_000;

type StoredPerformanceRange = {
  preset: DateRangePreset;
  from: string;
  to: string;
  savedAt: number;
};

function parsePreset(raw: string | null): DateRangePreset {
  if (raw && PRESETS.includes(raw as DateRangePreset)) {
    return raw as DateRangePreset;
  }
  return "custom";
}

function readStoredRange(): StoredPerformanceRange | null {
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_RANGE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPerformanceRange;
    if (
      !parsed ||
      typeof parsed.savedAt !== "number" ||
      !PRESETS.includes(parsed.preset)
    ) {
      return null;
    }
    if (Date.now() - parsed.savedAt > PERFORMANCE_RANGE_TTL_MS) {
      window.localStorage.removeItem(PERFORMANCE_RANGE_STORAGE_KEY);
      return null;
    }
    return {
      preset: parsed.preset,
      from: typeof parsed.from === "string" ? parsed.from : "",
      to: typeof parsed.to === "string" ? parsed.to : "",
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

function writeStoredRange(sel: DateRangeSelection): void {
  try {
    const payload: StoredPerformanceRange = {
      preset: sel.preset,
      from: sel.from,
      to: sel.to,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(
      PERFORMANCE_RANGE_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // ignore quota / private mode
  }
}

function resolveStoredSelection(
  stored: StoredPerformanceRange,
): DateRangeSelection {
  if (stored.preset === "all") return ALL_TIME_RANGE;
  if (stored.preset === "custom") {
    if (stored.from && stored.to) {
      return { preset: "custom", from: stored.from, to: stored.to };
    }
    return thisMonthRange();
  }
  return selectionForPreset(stored.preset);
}

export function usePerformanceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const didDefaultRef = useRef(false);

  const listId = searchParams.get("listId");
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";
  const rangeParam = searchParams.get("range");

  const replace = useCallback(
    (next: {
      listId: string | null;
      from: string;
      to: string;
      range: DateRangePreset | null;
    }) => {
      const q = performanceQuery(next);
      const s = q.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  // Default / restore period when the URL has none yet.
  // Explicit "all" is preserved via range=all.
  useEffect(() => {
    if (didDefaultRef.current) return;
    const hasDates = Boolean(fromParam && toParam);
    const isExplicitAll = rangeParam === "all";

    if (hasDates || isExplicitAll) {
      didDefaultRef.current = true;
      writeStoredRange({
        preset: isExplicitAll
          ? "all"
          : rangeParam
            ? parsePreset(rangeParam)
            : "custom",
        from: fromParam,
        to: toParam,
      });
      return;
    }

    didDefaultRef.current = true;
    const stored = readStoredRange();
    const restored = stored ? resolveStoredSelection(stored) : thisMonthRange();
    writeStoredRange(restored);
    replace({
      listId,
      from: restored.from,
      to: restored.to,
      range: restored.preset === "custom" ? null : restored.preset,
    });
  }, [fromParam, toParam, rangeParam, listId, replace]);

  const dateRange: DateRangeSelection = useMemo(() => {
    if (!fromParam && !toParam) {
      if (rangeParam === "all") return ALL_TIME_RANGE;
      return thisMonthRange();
    }
    const preset = rangeParam ? parsePreset(rangeParam) : "custom";
    return {
      preset: preset === "all" ? "custom" : preset,
      from: fromParam,
      to: toParam,
    };
  }, [fromParam, toParam, rangeParam]);

  // Effective dates always drive API fetches (never empty unless all-time).
  const from = dateRange.from;
  const to = dateRange.to;

  const query = useMemo(
    () =>
      performanceQuery({
        listId,
        from,
        to,
        range: dateRange.preset,
      }),
    [listId, from, to, dateRange.preset],
  );

  const setListId = useCallback(
    (id: string | null) =>
      replace({
        listId: id,
        from,
        to,
        range: dateRange.preset,
      }),
    [replace, from, to, dateRange.preset],
  );

  const setDateRange = useCallback(
    (sel: DateRangeSelection) => {
      writeStoredRange(sel);
      replace({
        listId,
        from: sel.from,
        to: sel.to,
        range: sel.preset === "custom" ? null : sel.preset,
      });
    },
    [replace, listId],
  );

  return { listId, from, to, dateRange, query, setListId, setDateRange };
}
