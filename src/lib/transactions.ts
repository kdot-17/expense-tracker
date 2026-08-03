/**
 * The data layer. There is no store wired up yet, so `TRANSACTIONS` is empty and
 * every selector below returns the zero case. The dashboard renders its full
 * scaffold against this — charts, calendar, ledger and all — so wiring a real
 * source later means replacing this module's data and nothing else.
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
  /** Whole rupees. */
  amount: number;
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

/** Last month's closing total, for the month-over-month strip. */
export const PREVIOUS_MONTH_TOTAL = 0;

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

export function totalSpend(): number {
  return TRANSACTIONS.reduce((sum, t) => sum + t.amount, 0);
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

export function byCategory(): { category: Category; amount: number }[] {
  const totals = new Map<Category, number>();
  for (const t of TRANSACTIONS) {
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }
  return CATEGORY_ORDER.map((category) => ({
    category,
    amount: totals.get(category) ?? 0,
  })).filter((entry) => entry.amount > 0);
}

export function byGroup(): { group: Group; amount: number }[] {
  const totals = new Map<Group, number>();
  for (const t of TRANSACTIONS) {
    const group = CATEGORY_TO_GROUP[t.category];
    totals.set(group, (totals.get(group) ?? 0) + t.amount);
  }
  return GROUP_ORDER.map((group) => ({ group, amount: totals.get(group) ?? 0 }));
}

export function groupVsPrevious(): { group: Group; delta: number }[] {
  // With no previous month on file every group reads flat, which is honest.
  return byGroup().map(({ group }) => ({ group, delta: 0 }));
}

export function byDay(): number[] {
  const days = Array.from({ length: DAYS_IN_MONTH }, () => 0);
  for (const t of TRANSACTIONS) {
    if (t.day >= 1 && t.day <= DAYS_IN_MONTH) days[t.day - 1] += t.amount;
  }
  return days;
}

/** Calendar weeks, Monday start, so a partial first week stays partial. */
export function byWeek(): { label: string; amount: number; days: number[] }[] {
  const daily = byDay();
  const weeks: { label: string; amount: number; days: number[] }[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < DAYS_IN_MONTH) {
    const span = index === 0 ? 7 - FIRST_WEEKDAY : 7;
    const days = daily.slice(cursor, cursor + span);
    weeks.push({
      label: `${cursor + 1}–${Math.min(cursor + span, DAYS_IN_MONTH)}`,
      amount: days.reduce((sum, value) => sum + value, 0),
      days,
    });
    cursor += span;
    index += 1;
  }

  return weeks;
}

export function topMerchants(limit = 8): { merchant: string; amount: number }[] {
  const totals = new Map<string, number>();
  for (const t of TRANSACTIONS) {
    // Rent and the SIP are transfers, not merchants — they would flatten
    // everything else on the same axis.
    if (t.category === "Rent" || t.category === "Investments") continue;
    totals.set(t.merchant, (totals.get(t.merchant) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([merchant, amount]) => ({ merchant, amount }))
    .sort((a, b) => b.amount - a.amount)
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
  const spentDays = daily.filter((amount) => amount > 0);
  const busiest = Math.max(0, ...daily);

  return {
    total,
    delta: total - PREVIOUS_MONTH_TOTAL,
    deltaPct:
      PREVIOUS_MONTH_TOTAL === 0
        ? 0
        : ((total - PREVIOUS_MONTH_TOTAL) / PREVIOUS_MONTH_TOTAL) * 100,
    debits: TRANSACTIONS.length,
    // Null rather than a zero-valued fake row, so the UI can say "—" instead of
    // printing a transaction that does not exist.
    largest:
      TRANSACTIONS.length === 0
        ? null
        : TRANSACTIONS.reduce((max, t) => (t.amount > max.amount ? t : max)),
    quietDays: daily.filter((amount) => amount === 0).length,
    activeDays: spentDays.length,
    // Median of days money actually moved; including the zeros would only
    // report "a typical day is quiet", which is not the question being asked.
    medianDay: Math.round(median(spentDays)),
    busiestDay: busiest === 0 ? null : daily.indexOf(busiest) + 1,
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
