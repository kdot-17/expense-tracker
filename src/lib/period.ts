/**
 * Calendar arithmetic for the month being shown, pinned to Asia/Kolkata.
 *
 * Expense dates are calendar days handled as "YYYY-MM-DD" strings end to end
 * (docs/conventions.md), and the server runs in UTC while the reader lives at
 * UTC+5:30 — anything between midnight and 5:29am IST is still "yesterday" in
 * UTC. Every "what day is it" question in the app goes through this module so
 * the shift happens exactly once, via Intl rather than Date arithmetic.
 *
 * The `Date` objects below never carry a stored date in or out — they are
 * scratch integers for month-length and weekday lookups, pinned to UTC so the
 * host timezone cannot leak into the answer. That is calendar arithmetic, not
 * date parsing, which is what the no-`Date` rule is actually about.
 */

export type Period = {
  year: number;
  /** Calendar month, 1–12. Never the JS 0-indexed month. */
  month: number;
  /** "August 2026" */
  label: string;
  /** "2026-08-01" */
  firstDay: string;
  /** "2026-08-31" */
  lastDay: string;
  daysInMonth: number;
  /** Weekday of the 1st, 0 = Monday, matching the calendar's column order. */
  firstWeekday: number;
  /** Whether the period has actually finished, as of today in IST. */
  isClosed: boolean;
};

/** 0 = Monday, from JS's 0 = Sunday. */
function mondayFirst(jsDay: number): number {
  return (jsDay + 6) % 7;
}

const two = (n: number) => String(n).padStart(2, "0");

/**
 * Today as "YYYY-MM-DD" in Asia/Kolkata.
 *
 * `formatToParts` rather than trusting a locale's format string: en-CA happens
 * to print ISO order today, but assembling the parts by name means a locale
 * data change can never silently reorder the output.
 */
export function todayInIST(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** The calendar month containing `year`/`month` (1–12), closed relative to IST today. */
export function periodFor(year: number, month: number): Period {
  // Day 0 of the next month is the last day of this one. UTC-pinned scratch.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = mondayFirst(new Date(Date.UTC(year, month - 1, 1)).getUTCDay());
  const label = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  const lastDay = `${year}-${two(month)}-${two(daysInMonth)}`;

  return {
    year,
    month,
    label,
    firstDay: `${year}-${two(month)}-01`,
    lastDay,
    daysInMonth,
    firstWeekday,
    // ISO date strings compare correctly as strings — no Date round trip.
    isClosed: lastDay < todayInIST(),
  };
}

/** The month it is right now in Asia/Kolkata. */
export function currentPeriod(): Period {
  const today = todayInIST();
  return periodFor(Number(today.slice(0, 4)), Number(today.slice(5, 7)));
}

export function previousPeriodOf(period: Period): Period {
  return period.month === 1
    ? periodFor(period.year - 1, 12)
    : periodFor(period.year, period.month - 1);
}

/**
 * Whether `value` is a real calendar day written "YYYY-MM-DD".
 *
 * String and integer checks only — `new Date("2026-02-30")` would helpfully
 * roll over to March 2nd, which is exactly the wrong kind of helpful.
 */
export function isValidDateString(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Monday-first, matching `firstWeekday` and the calendar's column order.
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
