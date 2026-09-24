/**
 * The four figures the board opens with, before any chart.
 *
 * This is the one thing a dashboard genuinely gains over the document it
 * replaced. Every figure is derived, never typed as a literal, and the em-dash
 * rule from AGENTS.md bites harder here than anywhere else: a stat tile is
 * exactly the shape that tempts you to render `₹0` for "we do not know". With
 * nothing recorded every value here is an em dash, and the comparison against a
 * month that does not exist is withheld rather than reported as "no change".
 */

import { byVertical, stats, type Expense } from "@/lib/expenses";
import { formatPaise } from "@/lib/money";
import type { Period } from "@/lib/period";
import { slotOf } from "@/lib/taxonomy";

const MICRO = "text-micro font-semibold uppercase tracking-[0.2em]";
const DASH = "—";

function Stat({
  label,
  value,
  detail,
  swatchSlot,
}: {
  label: string;
  value: string;
  detail?: string;
  /** Draws the vertical's own colour beside the figure, since it names one. */
  swatchSlot?: number;
}) {
  return (
    // `@container`: a stat tile is a quarter of the row at `lg` and a half
    // below it, so `--text-kpi` measures the tile rather than the viewport —
    // the same reason the masthead's total does. Without a container the `cqi`
    // falls back to the viewport, which is degraded but not broken.
    <div className="border-rule bg-card @container min-w-0 border-2 px-3 py-2">
      <p className={`${MICRO} text-muted truncate`}>{label}</p>
      <p className="mt-1 flex items-center gap-2">
        {swatchSlot === undefined ? null : (
          <span
            aria-hidden
            className="border-rule size-3.5 shrink-0 border-2"
            style={{ background: `var(--slot-${swatchSlot})` }}
          />
        )}
        <span className="font-display text-kpi min-w-0 truncate leading-none tabular-nums">
          {value}
        </span>
      </p>
      <p className="text-ink-2 text-tick mt-1 truncate">{detail ?? " "}</p>
    </div>
  );
}

export function KpiStrip({
  period,
  expenses,
  previousMonthTotalPaise,
  todayDay,
}: {
  period: Period;
  expenses: Expense[];
  previousMonthTotalPaise: number | null;
  /** Day of the month it is right now, or null once the period is over. */
  todayDay: number | null;
}) {
  const s = stats(expenses, previousMonthTotalPaise, period.daysInMonth);
  const hasData = s.count > 0;
  // Null only when no prior month is on file — that comparison is withheld,
  // never shown as "no change". An empty current month against a recorded one
  // is a real comparison, and the against-last-month strip draws the same
  // deltas, so this tile must not contradict it by claiming there is nothing
  // to compare.
  const compare = s.vsPrevious;

  // Days that have actually happened. A month in progress has not had its
  // remaining days, and counting them as "days with nothing" would assert the
  // future spent nothing — the exact class of claim this strip must not make.
  const elapsedDays = todayDay ?? period.daysInMonth;

  // The single largest vertical, which is the question a glance is usually
  // asking. Ties resolve to the earlier slot, which is stable across months.
  const top = hasData
    ? byVertical(expenses).reduce((best, entry) =>
        entry.amountPaise > best.amountPaise ? entry : best,
      )
    : null;

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4">
      <Stat
        label={`${period.label} · ${period.isClosed ? "closed" : "in progress"}`}
        value={hasData ? formatPaise(s.totalPaise) : DASH}
        detail={hasData ? `${s.count} expenses` : "Nothing recorded yet"}
      />
      <Stat
        label="On last month"
        value={
          compare
            ? compare.deltaPct === null
              ? // A prior month on file that totalled zero: a percentage
                // against nothing is not a percentage, so the rupee movement
                // is the figure.
                `${compare.deltaPaise > 0 ? "+" : ""}${formatPaise(compare.deltaPaise)}`
              : `${compare.deltaPaise > 0 ? "+" : ""}${compare.deltaPct.toFixed(1)}%`
            : DASH
        }
        detail={
          compare
            ? compare.deltaPct === null
              ? // Derived, not typed: the branch means the prior total was
                // zero, but the figure still comes from the data.
                `Last month: ${formatPaise(previousMonthTotalPaise ?? 0)}`
              : `${compare.deltaPaise > 0 ? "+" : ""}${formatPaise(compare.deltaPaise)}`
            : "No prior month on file"
        }
      />
      <Stat
        label="Largest vertical"
        value={top ? top.vertical : DASH}
        detail={top ? formatPaise(top.amountPaise) : undefined}
        swatchSlot={top ? slotOf(top.vertical) : undefined}
      />
      <Stat
        label="Days active"
        value={hasData ? `${s.activeDays}/${elapsedDays}` : DASH}
        detail={
          hasData
            ? // Floored at zero: the app refuses future-dated rows, but a row
              // written around it (raw SQL) must not print a negative count.
              `${Math.max(0, elapsedDays - s.activeDays)} days with nothing${period.isClosed ? "" : " so far"}`
            : undefined
        }
      />
    </div>
  );
}
