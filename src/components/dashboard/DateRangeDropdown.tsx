"use client";

import { useEffect, useState } from "react";
import { headerDropdownTriggerClass } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import type { TranslateFn } from "@/lib/i18n/format";

export type DateRangePreset = "all" | "30d" | "month" | "quarter" | "year" | "custom";

export interface DateRangeSelection {
  preset: DateRangePreset;
  /** YYYY-MM-DD, empty when preset is "all" */
  from: string;
  /** YYYY-MM-DD, empty when preset is "all" */
  to: string;
}

export const ALL_TIME_RANGE: DateRangeSelection = {
  preset: "all",
  from: "",
  to: "",
};

export function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Calendar month to date — default period for Performance. */
export function thisMonthRange(today: Date = new Date()): DateRangeSelection {
  return {
    preset: "month",
    from: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: toIsoDate(today),
  };
}

const PRESET_KEYS: Record<Exclude<DateRangePreset, "custom">, MessageKey> = {
  all: "date.allTime",
  "30d": "date.last30",
  month: "date.thisMonth",
  quarter: "date.thisQuarter",
  year: "date.thisYear",
};

const PRESETS: {
  id: Exclude<DateRangePreset, "custom">;
  compute: (today: Date) => { from: string; to: string };
}[] = [
  {
    id: "month",
    compute: (today) => ({
      from: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: toIsoDate(today),
    }),
  },
  {
    id: "30d",
    compute: (today) => ({
      from: toIsoDate(new Date(today.getTime() - 29 * 86_400_000)),
      to: toIsoDate(today),
    }),
  },
  {
    id: "quarter",
    compute: (today) => ({
      from: toIsoDate(
        new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1),
      ),
      to: toIsoDate(today),
    }),
  },
  {
    id: "year",
    compute: (today) => ({
      from: toIsoDate(new Date(today.getFullYear(), 0, 1)),
      to: toIsoDate(today),
    }),
  },
  { id: "all", compute: () => ({ from: "", to: "" }) },
];

/** Resolve a named preset to concrete dates (recomputed for “today”). */
export function selectionForPreset(
  preset: Exclude<DateRangePreset, "custom">,
  today: Date = new Date(),
): DateRangeSelection {
  const entry = PRESETS.find((p) => p.id === preset);
  if (!entry) return thisMonthRange(today);
  const { from, to } = entry.compute(today);
  return { preset, from, to };
}

export function selectionLabel(
  value: DateRangeSelection,
  t: TranslateFn,
  formatRange: (from: string, to: string) => string,
): string {
  if (value.preset === "all") return t("date.allTime");
  if (value.preset === "custom") return formatRange(value.from, value.to);
  const presetKey = PRESET_KEYS[value.preset];
  const presetLabel = t(presetKey);
  if (value.from && value.to) {
    return `${presetLabel} · ${formatRange(value.from, value.to)}`;
  }
  return presetLabel;
}

function IconCalendar() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      className="shrink-0 text-[var(--muted)]"
      aria-hidden
    >
      <rect x="1.5" y="2.5" width="11" height="10" rx="2" />
      <path d="M1.5 5.5h11M4.5 1.25v2.5M9.5 1.25v2.5" />
    </svg>
  );
}

const panelInputClass =
  "w-full rounded-lg border border-[var(--border-strong)] bg-transparent px-2 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:border-[var(--accent)] dark:text-zinc-200 dark:[color-scheme:dark]";

interface DateRangeDropdownProps {
  value: DateRangeSelection;
  onChange: (value: DateRangeSelection) => void;
}

export function DateRangeDropdown({ value, onChange }: DateRangeDropdownProps) {
  const { t, formatRangeLabel: formatRange } = useI18n();
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(value.from);
  const [draftTo, setDraftTo] = useState(value.to);

  useEffect(() => {
    setDraftFrom(value.from);
    setDraftTo(value.to);
  }, [value.from, value.to]);

  const customValid =
    draftFrom !== "" && draftTo !== "" && draftFrom <= draftTo;

  const applyCustom = () => {
    if (!customValid) return;
    onChange({ preset: "custom", from: draftFrom, to: draftTo });
    setOpen(false);
  };

  const selectPreset = (preset: (typeof PRESETS)[number]) => {
    const { from, to } = preset.compute(new Date());
    setDraftFrom(from);
    setDraftTo(to);
    onChange({ preset: preset.id, from, to });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`${headerDropdownTriggerClass} w-full max-w-[16rem] sm:w-auto`}
        aria-label={t("date.filterPeriod")}
      >
        <IconCalendar />
        <span className="min-w-0 flex-1 truncate text-left sm:flex-initial">
          {selectionLabel(value, t, formatRange)}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-[var(--muted)]" />
      </PopoverTrigger>
      <PopoverContent className="w-[248px] p-1" align="end">
        {PRESETS.map((preset) => {
          const selected = value.preset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => selectPreset(preset)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                selected
                  ? "bg-accent text-accent-foreground"
                  : "text-zinc-700 hover:bg-black/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.06]"
              }`}
            >
              <span className="flex-1">{t(PRESET_KEYS[preset.id])}</span>
              {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" /> : null}
            </button>
          );
        })}

        <div className="mx-1.5 my-1 border-t border-[var(--border)]" aria-hidden />

        <div className="px-2.5 pb-2 pt-1.5">
          <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("date.customRange")}
          </p>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2">
              <span className="w-9 shrink-0 text-[0.6875rem] font-medium text-[var(--muted)]">
                {t("date.from")}
              </span>
              <input
                type="date"
                value={draftFrom}
                max={draftTo || undefined}
                onChange={(e) => setDraftFrom(e.target.value)}
                className={panelInputClass}
                aria-label={t("date.customStart")}
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="w-9 shrink-0 text-[0.6875rem] font-medium text-[var(--muted)]">
                {t("date.to")}
              </span>
              <input
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                onChange={(e) => setDraftTo(e.target.value)}
                className={panelInputClass}
                aria-label={t("date.customEnd")}
              />
            </label>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={applyCustom}
            disabled={!customValid}
            className="mt-2.5 w-full"
          >
            {t("common.apply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
