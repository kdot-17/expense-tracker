import { byDayPaise, weekdayMediansPaise, type Expense } from "@/lib/expenses";
import { formatPaise, formatPaiseCompact } from "@/lib/money";
import { RAMP_LABELS, rampStep } from "@/lib/palette";
import { WEEKDAYS_LONG, WEEKDAYS_SHORT, type Period } from "@/lib/period";

/** Card cell, hard ink slashes. A blank day should look struck out, not just
    pale — absence encoded as absence, in both themes. */
const QUIET_FILL =
  "repeating-linear-gradient(-45deg, var(--card) 0 5px, var(--rule) 5px 7px)";

export function CalendarBlock({
  period,
  expenses,
  todayDay,
}: {
  period: Period;
  expenses: Expense[];
  /** Day of the month it is right now, or null once the period is over. */
  todayDay: number | null;
}) {
  const daily = byDayPaise(expenses, period.daysInMonth);
  const medians = weekdayMediansPaise(expenses, period);
  // With nothing recorded, striking out all 31 days would assert that we know
  // no money moved. We do not — we know nothing. Draw a plain grid instead.
  const known = daily.some((paise) => paise > 0);
  const length = Math.ceil((period.firstWeekday + period.daysInMonth) / 7) * 7;
  const cells = Array.from({ length }, (_, i) => {
    const day = i - period.firstWeekday + 1;
    return day >= 1 && day <= period.daysInMonth ? day : null;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="border-rule @container grid grid-cols-7 border-2">
        {WEEKDAYS_SHORT.map((day, i) => (
          <div
            key={day}
            // Tracking is tightened from the usual 0.2em: seven three-letter
            // labels have to survive a 7-column grid on the narrowest phone.
            className="bg-rule text-page text-cell-head py-1.5 text-center font-semibold tracking-[0.06em] uppercase sm:tracking-[0.1em]"
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

          const paise = daily[day - 1];
          // A day that has not happened yet is not a day nothing moved — the
          // hatch asserts a fact, and there is no fact about tomorrow. But
          // that cuts one way only: a zero on a future day draws plain, while
          // a *recorded* amount is a fact the page holds and paints wherever
          // it sits, or the calendar would disagree with the total and the
          // spend line over the same rupees.
          const beyondToday = todayDay !== null && day > todayDay;
          const painted = paise > 0;
          const quiet = known && !beyondToday && paise === 0;
          const step = rampStep(paise);

          return (
            <div
              key={day}
              title={
                painted
                  ? `Day ${day} — ${formatPaise(paise)}`
                  : quiet
                    ? `Day ${day} — nothing moved`
                    : `Day ${day}`
              }
              className="flex aspect-square flex-col justify-between overflow-hidden p-1 sm:p-1.5"
              style={{
                background: painted ? `var(--ramp-${step})` : undefined,
                backgroundImage: quiet ? QUIET_FILL : undefined,
                color: quiet ? "var(--ink)" : `var(--ramp-on-${step})`,
                outline: "2px solid var(--rule)",
                outlineOffset: "-1px",
              }}
            >
              <span
                className="text-cell-day leading-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {day}
              </span>
              <span
                className="text-cell-figure leading-none font-semibold whitespace-nowrap tabular-nums"
                style={{
                  background: quiet ? "var(--card)" : undefined,
                  // rem, not px: this inset sits behind type, so it belongs to
                  // the type's scale rather than to the hatch it sits on.
                  padding: quiet ? "0.0625rem 0.125rem" : undefined,
                }}
              >
                {painted ? formatPaiseCompact(paise) : quiet ? "NIL" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* Median per weekday — the reason the blanks are not a coincidence. */}
      <div className="border-rule @container grid grid-cols-7 border-2">
        {medians.map((value, i) => (
          <div
            key={WEEKDAYS_LONG[i]}
            className="overflow-hidden px-1 py-1.5 text-center whitespace-nowrap"
            style={{ outline: "2px solid var(--rule)", outlineOffset: "-1px" }}
          >
            <span className="text-muted text-cell-figure block font-semibold tracking-[0.06em] uppercase">
              {WEEKDAYS_SHORT[i]}
            </span>
            <span
              className="text-cell-day block tabular-nums"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {known ? formatPaiseCompact(value) : "—"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-micro font-semibold uppercase tracking-[0.18em] text-muted">
        Median spend, by weekday
      </p>

      {/* The key explains the ramp and the nil hatch. With nothing wired up
          neither is on the grid, so a legend here would document an encoding
          the reader cannot see. */}
      {known ? (
        <div className="border-rule flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 pt-3">
          <span className="text-muted text-micro font-semibold tracking-[0.18em] uppercase">
            Per day
          </span>
          {RAMP_LABELS.map((label, i) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="border-rule size-3.5 border-2"
                style={{ background: `var(--ramp-${i})` }}
              />
              <span className="text-ink-2 text-tick tabular-nums">{label}</span>
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="border-rule size-3.5 border-2"
              style={{ backgroundImage: QUIET_FILL }}
            />
            <span className="text-ink-2 text-tick">nil</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
