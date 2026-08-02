/**
 * Every amount in this app is INR, stored as an integer number of paise.
 *
 * Floats are never used for money: `0.1 + 0.2` style error would land directly
 * in a spend total. Rupee input arrives from `FormData` as a string, so it is
 * parsed digit-wise rather than via `parseFloat(x) * 100` — multiplying a
 * parsed float reintroduces exactly the binary-fraction error being avoided.
 */

/** Postgres `integer` upper bound — the column type backing `amount_paise`. */
const MAX_PAISE = 2_147_483_647;

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

const INR_FORMAT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

/** Formats paise for display, with Indian lakh/crore grouping: `₹1,23,456.78`. */
export function formatPaise(paise: number): string {
  // Dividing by 100 introduces a float, which is fine only because this value
  // is display-only and never flows back into stored arithmetic.
  return INR_FORMAT.format(paise / 100);
}
