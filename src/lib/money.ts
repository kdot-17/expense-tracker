/**
 * The one money module. Every amount in this app is INR held as an integer
 * number of paise — in the database, in the data layer, and in every value
 * passed between them. Rupees exist only as the *output* of the formatters
 * below, at the moment something is painted on screen.
 *
 * Floats are never used for money: `0.1 + 0.2` style error would land directly
 * in a spend total. Rupee input arrives from `FormData` as a string, so it is
 * parsed digit-wise rather than via `parseFloat(x) * 100` — multiplying a
 * parsed float reintroduces exactly the binary-fraction error being avoided.
 *
 * Every formatter here takes paise, and every one says so in its name. That is
 * deliberate: a helper called `formatINR(amount)` reads as correct when handed
 * rupees, and that is how a rupee value gets a hundred times too small without
 * anything failing. See docs/money.md.
 */

/**
 * Postgres `integer` upper bound — the column type backing `amount_paise`.
 * Exported so a caller can tell "over the cap" apart from "unparseable" and
 * word the two failures differently, with the cap itself derived from here
 * rather than typed into a message.
 */
export const MAX_PAISE = 2_147_483_647;

/** Rupees, with an optional 1- or 2-digit paise fraction. No sign, no exponent. */
const RUPEES_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Converts a user-entered rupee string to paise.
 *
 * Returns `null` for anything unparseable so callers can surface a validation
 * message instead of storing a wrong number. Note that `"0"` parses to `0`,
 * which is a *valid parse* but not a valid expense — the amount > 0 rule is a
 * separate concern, enforced by the caller and by a CHECK constraint.
 */
export function parseRupeesToPaise(input: string): number | null {
  // Accepts what people actually type or paste: "₹1,23,456.78".
  const cleaned = input.replace(/[₹,\s]/g, "");

  const match = RUPEES_PATTERN.exec(cleaned);
  if (!match) return null;

  const [, rupees, fraction = ""] = match;

  // "254.2" is 2 *tenths* of a rupee — 20 paise, not 2. Padding before parsing
  // is what makes one-decimal input come out right.
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));

  // Reject here rather than letting Postgres raise on insert.
  if (paise > MAX_PAISE) return null;

  return paise;
}

/**
 * Dividing by 100 introduces a float. That is safe in this file and nowhere
 * else: the result is a display string that never flows back into arithmetic
 * that gets stored.
 */
function toRupees(paise: number): number {
  return paise / 100;
}

const EXACT_INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

/**
 * Rupees to the paise, with Indian lakh/crore grouping: `₹1,23,456.78`.
 *
 * The app's one display format. Amounts are shown in full rather than rounded
 * to the rupee: the paise are real, and a figure that quietly drops them is a
 * figure that disagrees with what was entered. `.00` on a round amount is a
 * cheaper cost than that.
 */
export function formatPaise(paise: number): string {
  return EXACT_INR.format(toRupees(paise));
}

const LAKH_IN_PAISE = 1_00_00_000;
const THOUSAND_IN_PAISE = 1_00_000;

/**
 * `₹2.6k` / `₹29.4k` / `₹1.2L` — axis ticks and calendar cells only, never a
 * headline and never a figure being reported as exact.
 *
 * This one *is* an approximation by design: `₹2.6k` is already rounded, so
 * below ₹1,000 it prints whole rupees rather than pretending to a precision the
 * rest of the string does not have. Anywhere the exact number matters, use
 * `formatPaise`.
 */
export function formatPaiseCompact(paise: number): string {
  if (paise >= LAKH_IN_PAISE) return `₹${(paise / LAKH_IN_PAISE).toFixed(1)}L`;
  if (paise >= THOUSAND_IN_PAISE) return `₹${(paise / THOUSAND_IN_PAISE).toFixed(1)}k`;

  // Round to rupees, then re-test the thousand mark. ₹999.60 rounds to 1000,
  // which would otherwise print a bare "₹1000" one paisa below the value that
  // prints "₹1.0k" — and inside the band the calendar key calls "< ₹1k".
  const rupees = Math.round(toRupees(paise));
  return rupees >= 1000 ? `₹${(rupees / 1000).toFixed(1)}k` : `₹${rupees}`;
}
