import { formatPaise } from "@/lib/money";
import { byGroup, groupVsPrevious, PREVIOUS_MONTH_TOTAL_PAISE } from "@/lib/transactions";

import { EmptyPlot } from "./empty";

/**
 * A diverging strip, not a chart: one shared zero line down the middle, bars
 * scaled to the largest absolute move in either direction. Direction and a
 * signed number both carry the sign, so the colour is only ever identity.
 */
export function VersusPrevious() {
  // Without a prior month every delta is 0, and the rows would read "no change"
  // and "identical to last month" — a comparison against a month that does not
  // exist. The header already says "No prior month on file"; say the same here.
  if (PREVIOUS_MONTH_TOTAL_PAISE <= 0) {
    return <EmptyPlot label="No prior month on file" />;
  }

  const deltas = groupVsPrevious();
  const groups = byGroup();
  // Floored at 1: a real month where every group moved by exactly zero would
  // otherwise divide by zero and size every bar NaN.
  const max = Math.max(1, ...deltas.map((entry) => Math.abs(entry.deltaPaise)));

  return (
    <div className="flex flex-col">
      <div className="flex items-end justify-between border-b-2 border-rule pb-2">
        <span className="text-micro font-semibold uppercase tracking-[0.18em] text-muted">
          ◀ Spent less
        </span>
        <span className="text-micro font-semibold uppercase tracking-[0.18em] text-muted">
          Spent more ▶
        </span>
      </div>

      <ul>
        {deltas.map((entry, i) => {
          const width = (Math.abs(entry.deltaPaise) / max) * 50;
          const up = entry.deltaPaise > 0;
          const flat = entry.deltaPaise === 0;

          return (
            <li
              key={entry.group}
              // Name and value columns are `minmax` in rem with a fractional
              // ceiling: they hold a floor wide enough for the longest group
              // name at that step — "Investments & SIP" — and then share any
              // slack proportionally, which fixed px tracks could not do. The
              // bar between them absorbs the rest. Below `sm` the name is
              // allowed to wrap onto a second line instead, as it always was.
              className="border-grid grid grid-cols-[minmax(6rem,0.9fr)_minmax(0,2fr)_minmax(4.75rem,0.7fr)] items-center gap-2 border-b py-2 sm:grid-cols-[minmax(8.75rem,0.9fr)_minmax(0,2fr)_minmax(5.75rem,0.7fr)] sm:gap-3"
              title={`${entry.group}: ${formatPaise(groups[i].amountPaise)} this month, ${
                flat
                  ? "identical to last month"
                  : `${up ? "+" : "−"}${formatPaise(Math.abs(entry.deltaPaise))} on last month`
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-3 shrink-0 border-2 border-rule"
                  style={{ background: `var(--slot-${i})` }}
                />
                <span className="min-w-0 text-tick leading-tight font-medium break-words text-ink sm:text-note">
                  {entry.group}
                </span>
              </span>

              <span className="relative block h-7">
                <span
                  aria-hidden
                  className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-rule"
                />
                {flat ? (
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-1/2 h-2 w-4 -translate-x-1/2 -translate-y-1/2 bg-rule"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="absolute top-0.5 bottom-0.5"
                    style={{
                      background: `var(--slot-${i})`,
                      outline: "2px solid var(--rule)",
                      width: `${width}%`,
                      left: up ? "50%" : undefined,
                      right: up ? undefined : "50%",
                    }}
                  />
                )}
              </span>

              <span className="text-right text-tick tabular-nums sm:text-note">
                {flat ? (
                  <span className="text-muted">no change</span>
                ) : (
                  <span style={{ fontFamily: "var(--font-display)" }}>
                    {up ? "+" : "−"}
                    {formatPaise(Math.abs(entry.deltaPaise))}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
