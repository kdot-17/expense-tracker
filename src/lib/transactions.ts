/**
 * The data layer. There is no store wired up yet, so `TRANSACTIONS` is empty and
 * every selector below returns the zero case. The dashboard renders its full
 * scaffold against this — charts, calendar, ledger and all — so wiring a real
 * source later means replacing this module's data and nothing else.
 *
 * Every amount here is an **integer number of paise**, matching the
 * `expenses.amount_paise` column it will eventually be read from. Nothing in
 * this module formats: rupees are a display concern, and the formatters that
 * produce them live in `@/lib/money`. Identifiers holding money carry a
 * `Paise`/`PAISE` suffix so a rupee value cannot be passed in unnoticed.
 *
 * Keep the exported signatures stable; the whole page reads through them.
 */

export type Category =
  | "Rent"
  | "Investments"
  | "Groceries"
  | "Food delivery"
  | "Eating out"
  | "Transport"
  | "Bills"
  | "Shopping"
  | "Health"
  | "Entertainment";

export type Transaction = {
  /** Day of the month, 1-indexed. */
  day: number;
  merchant: string;
  category: Category;
  /** Integer paise, never rupees. ₹1,200 is 120000. */
  amountPaise: number;
};

/**
 * Seven display groups. The ten categories collapse into these because ten arcs
 * is more than a pie can carry legibly and more hues than the palette was
 * validated for. Frozen order — slot 0 is always Rent, so the shape of the pie
 * is comparable month to month. See docs/design-system.md.
 */
export type Group =
  | "Rent & home"
  | "Food & dining"
  | "Groceries"
  | "Transport"
  | "Bills & recharge"
  | "Investments & SIP"
  | "Other";

export const GROUP_ORDER: Group[] = [
  "Rent & home",
  "Food & dining",
  "Groceries",
  "Transport",
  "Bills & recharge",
  "Investments & SIP",
  "Other",
];

export const CATEGORY_TO_GROUP: Record<Category, Group> = {
  Rent: "Rent & home",
  "Food delivery": "Food & dining",
  "Eating out": "Food & dining",
  Groceries: "Groceries",
  Transport: "Transport",
  Bills: "Bills & recharge",
  Investments: "Investments & SIP",
  Shopping: "Other",
  Health: "Other",
  Entertainment: "Other",
};

/** Nothing is connected yet. */
export const TRANSACTIONS: Transaction[] = [];

/** Last month's closing total, in paise, for the month-over-month strip. */
export const PREVIOUS_MONTH_TOTAL_PAISE = 0;

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
 * Monday-first, matching FIRST_WEEKDAY and the calendar's column order. Declared
 * here rather than in a component so every weekday label in the app comes from
 * one place — the calendar grid and its median strip used to disagree, one
 * showing "M T W" and the other "Mon Tue Wed".
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

/** True while nothing is wired up — the page uses it to pick empty states. */
export const HAS_DATA = TRANSACTIONS.length > 0;

/* --------------------------------------------------------------- selectors */

export function totalSpendPaise(): number {
  return TRANSACTIONS.reduce((sum, t) => sum + t.amountPaise, 0);
}

export const CATEGORY_ORDER: Category[] = [
  "Rent",
  "Investments",
  "Groceries",
  "Food delivery",
  "Eating out",
  "Transport",
  "Bills",
  "Shopping",
  "Health",
  "Entertainment",
];

export function byCategory(): { category: Category; amountPaise: number }[] {
  const totals = new Map<Category, number>();
  for (const t of TRANSACTIONS) {
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amountPaise);
  }
  return CATEGORY_ORDER.map((category) => ({
    category,
    amountPaise: totals.get(category) ?? 0,
  })).filter((entry) => entry.amountPaise > 0);
}

export function byGroup(): { group: Group; amountPaise: number }[] {
  const totals = new Map<Group, number>();
  for (const t of TRANSACTIONS) {
    const group = CATEGORY_TO_GROUP[t.category];
    totals.set(group, (totals.get(group) ?? 0) + t.amountPaise);
  }
  return GROUP_ORDER.map((group) => ({
    group,
    amountPaise: totals.get(group) ?? 0,
  }));
}

export function groupVsPrevious(): { group: Group; deltaPaise: number }[] {
  // With no previous month on file every group reads flat, which is honest.
  return byGroup().map(({ group }) => ({ group, deltaPaise: 0 }));
}

export function byDayPaise(): number[] {
  const days = Array.from({ length: DAYS_IN_MONTH }, () => 0);
  for (const t of TRANSACTIONS) {
    if (t.day >= 1 && t.day <= DAYS_IN_MONTH) days[t.day - 1] += t.amountPaise;
  }
  return days;
}

/** Calendar weeks, Monday start, so a partial first week stays partial. */
export function byWeek(): { label: string; amountPaise: number; daysPaise: number[] }[] {
  const daily = byDayPaise();
  const weeks: { label: string; amountPaise: number; daysPaise: number[] }[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < DAYS_IN_MONTH) {
    const span = index === 0 ? 7 - FIRST_WEEKDAY : 7;
    const daysPaise = daily.slice(cursor, cursor + span);
    weeks.push({
      label: `${cursor + 1}–${Math.min(cursor + span, DAYS_IN_MONTH)}`,
      amountPaise: daysPaise.reduce((sum, value) => sum + value, 0),
      daysPaise,
    });
    cursor += span;
    index += 1;
  }

  return weeks;
}

export function topMerchants(limit = 8): { merchant: string; amountPaise: number }[] {
  const totals = new Map<string, number>();
  for (const t of TRANSACTIONS) {
    // Rent and the SIP are transfers, not merchants — they would flatten
    // everything else on the same axis.
    if (t.category === "Rent" || t.category === "Investments") continue;
    totals.set(t.merchant, (totals.get(t.merchant) ?? 0) + t.amountPaise);
  }
  return [...totals.entries()]
    .map(([merchant, amountPaise]) => ({ merchant, amountPaise }))
    .sort((a, b) => b.amountPaise - a.amountPaise)
    .slice(0, limit);
}

/** Halves on an even count, so the result can land on a half-paise. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Median spend per weekday (Mon..Sun), counting only days money moved. Rounded
 * back to whole paise — a median can halve onto a fraction, and every amount
 * that leaves this module is an integer.
 */
export function weekdayMediansPaise(): number[] {
  const daily = byDayPaise();
  const buckets: number[][] = Array.from({ length: 7 }, () => []);

  for (let day = 1; day <= DAYS_IN_MONTH; day += 1) {
    const weekday = (FIRST_WEEKDAY + day - 1) % 7;
    if (daily[day - 1] > 0) buckets[weekday].push(daily[day - 1]);
  }

  return buckets.map((values) => Math.round(median(values)));
}

export function stats() {
  const daily = byDayPaise();
  const totalPaise = totalSpendPaise();
  const spentDays = daily.filter((paise) => paise > 0);
  const busiest = Math.max(0, ...daily);

  return {
    totalPaise,
    deltaPaise: totalPaise - PREVIOUS_MONTH_TOTAL_PAISE,
    // A ratio of two paise figures, so the unit cancels — this is a plain
    // percentage and carries no `Paise` suffix.
    deltaPct:
      PREVIOUS_MONTH_TOTAL_PAISE === 0
        ? 0
        : ((totalPaise - PREVIOUS_MONTH_TOTAL_PAISE) / PREVIOUS_MONTH_TOTAL_PAISE) * 100,
    debits: TRANSACTIONS.length,
    // Null rather than a zero-valued fake row, so the UI can say "—" instead of
    // printing a transaction that does not exist.
    largest:
      TRANSACTIONS.length === 0
        ? null
        : TRANSACTIONS.reduce((max, t) => (t.amountPaise > max.amountPaise ? t : max)),
    quietDays: daily.filter((paise) => paise === 0).length,
    activeDays: spentDays.length,
    // Median of days money actually moved; including the zeros would only
    // report "a typical day is quiet", which is not the question being asked.
    medianDayPaise: Math.round(median(spentDays)),
    busiestDay: busiest === 0 ? null : daily.indexOf(busiest) + 1,
  };
}
