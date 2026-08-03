import {
  byDay,
  DAYS_IN_MONTH,
  FIRST_WEEKDAY,
  weekdayMedians,
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
} from "@/lib/expenses";
import { compactPaise, formatPaiseWhole } from "@/lib/money";
import { RAMP_LABELS, rampStep } from "@/lib/palette";

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
        {WEEKDAYS_SHORT.map((day, i) => (
          <div
            key={day}
            // Tracking is tightened from the usual 0.2em: seven three-letter
            // labels have to survive a 7-column grid at 360px.
            className="bg-rule text-page py-1.5 text-center text-[10px] font-semibold tracking-[0.06em] uppercase sm:text-[11px] sm:tracking-[0.1em]"
          >
            <abbr title={WEEKDAYS_LONG[i]} className="no-underline">
              {day}
            </abbr>
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
                    : `Day ${day} — ${formatPaiseWhole(amount)}`
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
                {!known ? "" : quiet ? "NIL" : compactPaise(amount)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Median per weekday — the reason the blanks are not a coincidence. */}
      <div className="grid grid-cols-7 border-2 border-rule">
        {medians.map((value, i) => (
          <div
            key={WEEKDAYS_LONG[i]}
            className="overflow-hidden px-1 py-1.5 text-center whitespace-nowrap"
            style={{ outline: "2px solid var(--rule)", outlineOffset: "-1px" }}
          >
            <span className="text-muted block text-[8px] font-semibold tracking-[0.06em] uppercase">
              {WEEKDAYS_SHORT[i]}
            </span>
            <span
              className="block text-[11px] tabular-nums sm:text-[13px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {known ? compactPaise(value) : "—"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        Median spend, by weekday
      </p>

      {/* The key explains the ramp and the nil hatch. With nothing wired up
          neither is on the grid, so a legend here would document an encoding
          the reader cannot see. */}
      {known ? (
        <div className="border-rule flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 pt-3">
          <span className="text-muted text-[10px] font-semibold tracking-[0.18em] uppercase">
            Per day
          </span>
          {RAMP_LABELS.map((label, i) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="border-rule size-3.5 border-2"
                style={{ background: `var(--ramp-${i})` }}
              />
              <span className="text-ink-2 text-[11px] tabular-nums">{label}</span>
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="border-rule size-3.5 border-2"
              style={{ backgroundImage: QUIET_FILL }}
            />
            <span className="text-ink-2 text-[11px]">nil</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
