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

import {
  byVertical,
  DAYS_IN_MONTH,
  MONTH_LABEL,
  PERIOD_IS_CLOSED,
  PREVIOUS_MONTH_TOTAL_PAISE,
  stats,
} from "@/lib/expenses";
import { formatPaise } from "@/lib/money";
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
      <p className="text-ink-2 text-tick mt-1 truncate">{detail ?? " "}</p>
    </div>
  );
}

export function KpiStrip() {
  const s = stats();
  const hasData = s.count > 0;
  const hasPrevious = PREVIOUS_MONTH_TOTAL_PAISE > 0;

  // The single largest vertical, which is the question a glance is usually
  // asking. Ties resolve to the earlier slot, which is stable across months.
  const top = hasData
    ? byVertical().reduce((best, entry) =>
        entry.amountPaise > best.amountPaise ? entry : best,
      )
    : null;

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4">
      <Stat
        label={`${MONTH_LABEL} · ${PERIOD_IS_CLOSED ? "closed" : "in progress"}`}
        value={hasData ? formatPaise(s.totalPaise) : DASH}
        detail={hasData ? `${s.count} expenses` : "Nothing recorded yet"}
      />
      <Stat
        label="On last month"
        value={
          // No prior month is not "no change" — it is nothing to say.
          hasPrevious && hasData
            ? `${s.deltaPaise > 0 ? "+" : ""}${s.deltaPct.toFixed(1)}%`
            : DASH
        }
        detail={
          hasPrevious && hasData
            ? `${s.deltaPaise > 0 ? "+" : ""}${formatPaise(s.deltaPaise)}`
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
        value={hasData ? `${s.activeDays}/${DAYS_IN_MONTH}` : DASH}
        detail={hasData ? `${DAYS_IN_MONTH - s.activeDays} days with nothing` : undefined}
      />
    </div>
  );
}
