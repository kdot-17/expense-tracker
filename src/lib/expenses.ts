/**
 * The selectors the dashboard reads through — pure functions over the month
 * the page fetched.
 *
 * The database side lives in `src/lib/expenses-data.ts` (`server-only`); this
 * module stays importable from anywhere because it holds no state and touches
 * no store. `page.tsx` fetches one `MonthData` per render and threads it down,
 * so a client component only ever receives computed plain values — it never
 * aggregates, per docs/conventions.md.
 *
 * Shapes here mirror `expenses` in `src/db/schema.ts`: an amount is an integer
 * number of **paise**, and an expense points at both its subtype and its
 * vertical, exactly as the composite foreign key stores it. There is
 * deliberately no `merchant` field — the schema has no such column, and the
 * question "which app did the money go to" is answered by the subtype.
 *
 * The unknown case is typed, not remembered: `MonthData`'s previous-month
 * fields are `null` when no prior month is on file, which is a different thing
 * from a prior month that totalled zero, and the selectors pass that null
 * through rather than manufacturing ten zeroes for a comparison nobody made.
 */

import type { Period } from "@/lib/period";
import {
  slotOf,
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

/** One month as the page fetches it — see `getMonthData` in expenses-data.ts. */
export type MonthData = {
  /** Sorted by day ascending, then insertion order — the ledger's order. */
  expenses: Expense[];
  /**
   * Null while the previous calendar month has nothing on file; a positive
   * number otherwise (every recorded amount clears the > 0 CHECK, so an
   * on-file month cannot total zero).
   */
  previousMonthTotalPaise: number | null;
  /** Null while no prior month is on file — not the same as all-zero deltas. */
  previousMonthByVertical: Partial<Record<Vertical, number>> | null;
};

/**
 * The soft cap on a note, enforced by the form's `maxLength` and re-checked by
 * the action — the column itself is unbounded `text`, so the cap is
 * presentation discipline the ledger's single-line rows depend on.
 */
export const NOTE_MAX_LENGTH = 140;

/* --------------------------------------------------------------- selectors */

export function totalSpendPaise(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amountPaise, 0);
}

/**
 * Every vertical, in frozen order, including the ones with nothing in them.
 *
 * The zero rows are kept rather than filtered: the pie, the legend and the
 * against-last-month strip all index into this by slot, and dropping empty
 * verticals would shift every colour as soon as one month happened to have no
 * Health spending.
 */
export function byVertical(
  expenses: Expense[],
): { vertical: Vertical; amountPaise: number }[] {
  const totals = new Map<Vertical, number>();
  for (const e of expenses) {
    totals.set(e.vertical, (totals.get(e.vertical) ?? 0) + e.amountPaise);
  }
  return VERTICAL_ORDER.map((vertical) => ({
    vertical,
    amountPaise: totals.get(vertical) ?? 0,
  }));
}

/**
 * Subtypes with money against them, in taxonomy order. Empty ones are dropped.
 *
 * Grouped from the rows rather than by walking the taxonomy, so money filed
 * under a subtype this module has never heard of still shows up — a row the
 * treemap silently dropped while the total kept counting it would be the page
 * disagreeing with itself. Names the taxonomy does know keep its order; ones
 * it does not sort after them, alphabetically.
 */
export function bySubtype(
  expenses: Expense[],
): (SubtypeRef & { amountPaise: number })[] {
  const totals = new Map<string, SubtypeRef & { amountPaise: number }>();
  for (const e of expenses) {
    const ref = { vertical: e.vertical, name: e.subtype };
    const key = subtypeKey(ref);
    const entry = totals.get(key);
    if (entry) {
      entry.amountPaise += e.amountPaise;
    } else {
      totals.set(key, { ...ref, amountPaise: e.amountPaise });
    }
  }

  const taxonomyIndex = (entry: SubtypeRef) => {
    const index = SUBTYPES[entry.vertical].indexOf(entry.name);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  return [...totals.values()].sort(
    (a, b) =>
      slotOf(a.vertical) - slotOf(b.vertical) ||
      taxonomyIndex(a) - taxonomyIndex(b) ||
      a.name.localeCompare(b.name),
  );
}

/**
 * Movement against the previous month, or null when there is nothing to
 * compare against.
 *
 * It returns null rather than ten zeroes on purpose. Ten zeroes render as "no
 * change" on every row and "identical to last month" in every tooltip — a
 * comparison the app has never actually made, stated as a finding. The caller
 * has to handle the null, which is the point.
 */
export function verticalVsPrevious(
  expenses: Expense[],
  previous: Partial<Record<Vertical, number>> | null,
): { vertical: Vertical; deltaPaise: number }[] | null {
  if (previous === null) return null;
  return byVertical(expenses).map(({ vertical, amountPaise }) => ({
    vertical,
    deltaPaise: amountPaise - (previous[vertical] ?? 0),
  }));
}

export function byDayPaise(expenses: Expense[], daysInMonth: number): number[] {
  const days = Array.from({ length: daysInMonth }, () => 0);
  for (const e of expenses) {
    if (e.day >= 1 && e.day <= daysInMonth) days[e.day - 1] += e.amountPaise;
  }
  return days;
}

/** Calendar weeks, Monday start, so a partial first week stays partial. */
export function byWeek(
  expenses: Expense[],
  period: Period,
): { label: string; amountPaise: number; daysPaise: number[] }[] {
  const daily = byDayPaise(expenses, period.daysInMonth);
  const weeks: { label: string; amountPaise: number; daysPaise: number[] }[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < period.daysInMonth) {
    const span = index === 0 ? 7 - period.firstWeekday : 7;
    const days = daily.slice(cursor, cursor + span);
    weeks.push({
      label: `${cursor + 1}–${Math.min(cursor + span, period.daysInMonth)}`,
      amountPaise: days.reduce((sum, value) => sum + value, 0),
      daysPaise: days,
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
export function topSubtypes(
  expenses: Expense[],
  limit = 8,
): (SubtypeRef & { amountPaise: number })[] {
  return [...bySubtype(expenses)]
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
export function weekdayMediansPaise(expenses: Expense[], period: Period): number[] {
  const daily = byDayPaise(expenses, period.daysInMonth);
  const buckets: number[][] = Array.from({ length: 7 }, () => []);

  for (let day = 1; day <= period.daysInMonth; day += 1) {
    const weekday = (period.firstWeekday + day - 1) % 7;
    if (daily[day - 1] > 0) buckets[weekday].push(daily[day - 1]);
  }

  return buckets.map((values) => Math.round(median(values)));
}

export type Stats = {
  totalPaise: number;
  count: number;
  activeDays: number;
  /**
   * Null when no prior month is on file — the comparison is withheld, never
   * reported as "no change". `deltaPct` is null when the prior total is zero
   * (a percentage against nothing is not a percentage) — unreachable while
   * `previousMonthTotalPaise` keeps its null-or-positive contract, but the
   * division guard is typed rather than assumed.
   */
  vsPrevious: { deltaPaise: number; deltaPct: number | null } | null;
};

export function stats(
  expenses: Expense[],
  previousMonthTotalPaise: number | null,
  daysInMonth: number,
): Stats {
  const daily = byDayPaise(expenses, daysInMonth);
  const totalPaise = totalSpendPaise(expenses);

  return {
    totalPaise,
    count: expenses.length,
    activeDays: daily.filter((amount) => amount > 0).length,
    vsPrevious:
      previousMonthTotalPaise === null
        ? null
        : {
            deltaPaise: totalPaise - previousMonthTotalPaise,
            // No suffix on the figure: a percentage has no unit.
            deltaPct:
              previousMonthTotalPaise === 0
                ? null
                : ((totalPaise - previousMonthTotalPaise) /
                    previousMonthTotalPaise) *
                  100,
          },
  };
}
