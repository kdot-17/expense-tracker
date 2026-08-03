import {
  byDay,
  DAYS_IN_MONTH,
  FIRST_WEEKDAY,
  formatINR,
  weekdayMedians,
} from "@/lib/transactions";
import { compactINR, RAMP_LABELS, rampStep } from "@/lib/palette";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** Card cell, hard ink slashes. A blank day should look struck out, not just
    pale — absence encoded as absence, in both themes. */
const QUIET_FILL =
  "repeating-linear-gradient(-45deg, var(--card) 0 5px, var(--rule) 5px 7px)";

export function CalendarBlock() {
  const daily = byDay();
  const medians = weekdayMedians();
  // With nothing wired up, striking out all 31 days would assert that we know
  // no money moved. We do not — we know nothing. Draw a plain grid instead.
  const known = daily.some((amount) => amount > 0);
  const length = Math.ceil((FIRST_WEEKDAY + DAYS_IN_MONTH) / 7) * 7;
  const cells = Array.from({ length }, (_, i) => {
    const day = i - FIRST_WEEKDAY + 1;
    return day >= 1 && day <= DAYS_IN_MONTH ? day : null;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-7 border-2 border-rule">
        {WEEKDAYS.map((letter, i) => (
          <div
            key={`${letter}-${i}`}
            className="bg-rule py-1.5 text-center text-[11px] font-semibold tracking-[0.2em] text-page"
          >
            {letter}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) {
            return (
              <div
                key={`blank-${i}`}
                aria-hidden
                className="aspect-square bg-grid"
                style={{ outline: "2px solid var(--rule)", outlineOffset: "-1px" }}
              />
            );
          }

          const amount = daily[day - 1];
          const quiet = known && amount === 0;
          const step = rampStep(amount);

          return (
            <div
              key={day}
              title={
                !known
                  ? `Day ${day}`
                  : quiet
                    ? `Day ${day} — nothing moved`
                    : `Day ${day} — ${formatINR(amount)}`
              }
              className="flex aspect-square flex-col justify-between overflow-hidden p-1 sm:p-1.5"
              style={{
                background: !known || quiet ? undefined : `var(--ramp-${step})`,
                backgroundImage: quiet ? QUIET_FILL : undefined,
                color: quiet ? "var(--ink)" : `var(--ramp-on-${step})`,
                outline: "2px solid var(--rule)",
                outlineOffset: "-1px",
              }}
            >
              <span
                className="text-[11px] leading-none sm:text-[13px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {day}
              </span>
              <span
                className="text-[8px] leading-none font-semibold whitespace-nowrap tabular-nums sm:text-[10px]"
                style={{
                  background: quiet ? "var(--card)" : undefined,
                  padding: quiet ? "1px 2px" : undefined,
                }}
              >
                {!known ? "" : quiet ? "NIL" : compactINR(amount)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Median per weekday — the reason the blanks are not a coincidence. */}
      <div className="grid grid-cols-7 border-2 border-rule">
        {medians.map((value, i) => (
          <div
            key={WEEKDAY_NAMES[i]}
            className="overflow-hidden px-1 py-1.5 text-center whitespace-nowrap"
            style={{ outline: "2px solid var(--rule)", outlineOffset: "-1px" }}
          >
            <span className="block text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
              {WEEKDAY_NAMES[i].slice(0, 3)}
            </span>
            <span
              className="block text-[11px] tabular-nums sm:text-[13px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {known ? compactINR(value) : "—"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        Median spend, by weekday
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-rule pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          Per day
        </span>
        {RAMP_LABELS.map((label, i) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3.5 border-2 border-rule"
              style={{ background: `var(--ramp-${i})` }}
            />
            <span className="text-[11px] tabular-nums text-ink-2">
              {RAMP_LABELS[i]}
            </span>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-3.5 border-2 border-rule"
            style={{ backgroundImage: QUIET_FILL }}
          />
          <span className="text-[11px] text-ink-2">nil</span>
        </span>
      </div>
    </div>
  );
}
