/**
 * The data layer, and the seam the whole dashboard reads through.
 *
 * There is no store wired up yet, so `EXPENSES` is empty and every selector
 * below returns the zero case. The page renders its full scaffold against
 * that — charts, calendar, ledger and all — so wiring the database in later
 * means replacing this module's data and nothing else. Keep the exported
 * signatures stable.
 *
 * Shapes here mirror `expenses` in `src/db/schema.ts`: an amount is an integer
 * number of **paise**, and an expense points at both its subtype and its
 * vertical, exactly as the composite foreign key stores it. There is
 * deliberately no `merchant` field — the schema has no such column, and the
 * question "which app did the money go to" is answered by the subtype.
 */

import {
  SUBTYPES,
  subtypeKey,
  VERTICAL_ORDER,
  type SubtypeRef,
  type Vertical,
} from "@/lib/taxonomy";

export type Expense = {
  /** Day of the month, 1-indexed. `spent_on` narrowed to the current period. */
  day: number;
  vertical: Vertical;
  /** Subtype name *within* `vertical`. Not unique on its own. */
  subtype: string;
  /** Integer paise, always greater than zero. See docs/money.md. */
  amountPaise: number;
  note?: string;
};

/** Nothing is connected yet. */
export const EXPENSES: Expense[] = [];

/**
 * Last month's closing total in paise, for the month-over-month strip.
 *
 * Annotated `number` rather than left to inference: as a bare literal, TypeScript
 * types it `0`, and `stats()` comparing it against zero then becomes a comparison
 * of two literal types. Setting it to any real figure would fail the build with
 * "these types have no overlap" — an error about the placeholder, not the code.
 */
export const PREVIOUS_MONTH_TOTAL_PAISE: number = 0;

/** True while nothing is wired up — the page uses it to pick empty states. */
export const HAS_DATA = EXPENSES.length > 0;

/* ------------------------------------------------------------------ period */

const now = new Date();

/** 0 = Monday, to match the calendar's column order. */
function mondayFirst(jsDay: number): number {
  return (jsDay + 6) % 7;
}

export const PERIOD = {
  year: now.getFullYear(),
  month: now.getMonth(),
  label: now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
  daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
  firstWeekday: mondayFirst(new Date(now.getFullYear(), now.getMonth(), 1).getDay()),
};

export const DAYS_IN_MONTH = PERIOD.daysInMonth;
export const FIRST_WEEKDAY = PERIOD.firstWeekday;
export const MONTH_LABEL = PERIOD.label;

/**
 * Monday-first, matching FIRST_WEEKDAY and the calendar's column order.
 * Declared here rather than in a component so every weekday label in the app
 * comes from one place — the calendar grid and its median strip used to
 * disagree, one showing "M T W" and the other "Mon Tue Wed".
 */
export const WEEKDAYS_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const WEEKDAYS_SHORT = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

/* --------------------------------------------------------------- selectors */

export function totalSpend(): number {
  return EXPENSES.reduce((sum, e) => sum + e.amountPaise, 0);
}

/**
 * Every vertical, in frozen order, including the ones with nothing in them.
 *
 * The zero rows are kept rather than filtered: the pie, the legend and the
 * against-last-month strip all index into this by slot, and dropping empty
 * verticals would shift every colour as soon as one month happened to have no
 * Health spending.
 */
export function byVertical(): { vertical: Vertical; amountPaise: number }[] {
  const totals = new Map<Vertical, number>();
  for (const e of EXPENSES) {
    totals.set(e.vertical, (totals.get(e.vertical) ?? 0) + e.amountPaise);
  }
  return VERTICAL_ORDER.map((vertical) => ({
    vertical,
    amountPaise: totals.get(vertical) ?? 0,
  }));
}

/** Subtypes with money against them, in taxonomy order. Empty ones are dropped. */
export function bySubtype(): (SubtypeRef & { amountPaise: number })[] {
  const totals = new Map<string, number>();
  for (const e of EXPENSES) {
    const key = subtypeKey({ vertical: e.vertical, name: e.subtype });
    totals.set(key, (totals.get(key) ?? 0) + e.amountPaise);
  }
  return VERTICAL_ORDER.flatMap((vertical) =>
    SUBTYPES[vertical]
      .map((name) => ({
        vertical,
        name,
        amountPaise: totals.get(subtypeKey({ vertical, name })) ?? 0,
      }))
      .filter((entry) => entry.amountPaise > 0),
  );
}

/**
 * Last month's total per vertical. Null while no per-vertical history exists —
 * which is a different thing from every vertical having moved by zero.
 */
export const PREVIOUS_MONTH_BY_VERTICAL: Partial<Record<Vertical, number>> | null =
  null;

/**
 * Movement against the previous month, or null when there is nothing to
 * compare against.
 *
 * It returns null rather than ten zeroes on purpose. Ten zeroes render as "no
 * change" on every row and "identical to last month" in every tooltip — a
 * comparison the app has never actually made, stated as a finding. The caller
 * has to handle the null, which is the point.
 */
export function verticalVsPrevious():
  | { vertical: Vertical; deltaPaise: number }[]
  | null {
  const previous = PREVIOUS_MONTH_BY_VERTICAL;
  if (previous === null) return null;
  return byVertical().map(({ vertical, amountPaise }) => ({
    vertical,
    deltaPaise: amountPaise - (previous[vertical] ?? 0),
  }));
}

export function byDay(): number[] {
  const days = Array.from({ length: DAYS_IN_MONTH }, () => 0);
  for (const e of EXPENSES) {
    if (e.day >= 1 && e.day <= DAYS_IN_MONTH) days[e.day - 1] += e.amountPaise;
  }
  return days;
}

/** Calendar weeks, Monday start, so a partial first week stays partial. */
export function byWeek(): { label: string; amountPaise: number; days: number[] }[] {
  const daily = byDay();
  const weeks: { label: string; amountPaise: number; days: number[] }[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < DAYS_IN_MONTH) {
    const span = index === 0 ? 7 - FIRST_WEEKDAY : 7;
    const days = daily.slice(cursor, cursor + span);
    weeks.push({
      label: `${cursor + 1}–${Math.min(cursor + span, DAYS_IN_MONTH)}`,
      amountPaise: days.reduce((sum, value) => sum + value, 0),
      days,
    });
    cursor += span;
    index += 1;
  }

  return weeks;
}

/**
 * The biggest subtypes of the month, across every vertical.
 *
 * Nothing is excluded. An EMI or a rent-sized row will tower over the rest,
 * and that is the true shape of the month — dropping the largest rows to make
 * the smaller ones easier to compare would be the chart lying about what
 * happened. Every bar is labelled with its own amount, so a short bar is still
 * readable next to a long one.
 */
export function topSubtypes(limit = 8): (SubtypeRef & { amountPaise: number })[] {
  return [...bySubtype()]
    .sort((a, b) => b.amountPaise - a.amountPaise)
    .slice(0, limit);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Median spend per weekday (Mon..Sun), counting only days money moved. */
export function weekdayMedians(): number[] {
  const daily = byDay();
  const buckets: number[][] = Array.from({ length: 7 }, () => []);

  for (let day = 1; day <= DAYS_IN_MONTH; day += 1) {
    const weekday = (FIRST_WEEKDAY + day - 1) % 7;
    if (daily[day - 1] > 0) buckets[weekday].push(daily[day - 1]);
  }

  return buckets.map((values) => Math.round(median(values)));
}

export function stats() {
  const daily = byDay();
  const total = totalSpend();

  return {
    total,
    deltaPaise: total - PREVIOUS_MONTH_TOTAL_PAISE,
    deltaPct:
      PREVIOUS_MONTH_TOTAL_PAISE === 0
        ? 0
        : ((total - PREVIOUS_MONTH_TOTAL_PAISE) / PREVIOUS_MONTH_TOTAL_PAISE) * 100,
    count: EXPENSES.length,
    activeDays: daily.filter((amount) => amount > 0).length,
  };
}
