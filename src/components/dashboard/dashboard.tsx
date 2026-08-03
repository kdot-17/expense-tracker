/**
 * The board. A KPI strip that never moves, and three views under it.
 *
 * This replaced a document you read top to bottom. The seven modules are split
 * by the question they answer rather than stacked in reading order — Overview
 * (where the month went, and how it compares), Breakdown (its shape over time
 * and by subtype), Ledger (the rows themselves) — so each view fits a screen
 * and the page itself never scrolls at `lg`. See docs/design-system.md §7.
 *
 * The KPI strip sits outside the tabs on purpose: the four figures you opened
 * the app for should not depend on which view you happen to be standing in.
 *
 * This is also where the client boundary is drawn: the charts are client
 * components, so everything they show is computed here on the server and
 * handed over as plain arrays and numbers. A chart never aggregates.
 */

import { CalendarBlock } from "@/components/dashboard/calendar";
import { SpendLine, SubtypeBars, VerticalPie } from "@/components/dashboard/charts";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { Ledger } from "@/components/dashboard/ledger";
import { TabShell } from "@/components/dashboard/tab-shell";
import { Tile } from "@/components/dashboard/tile";
import { Treemap } from "@/components/dashboard/treemap";
import { VersusPrevious } from "@/components/dashboard/versus-previous";
import {
  byDayPaise,
  byVertical,
  byWeek,
  topSubtypes,
  totalSpendPaise,
  type MonthData,
} from "@/lib/expenses";
import { body, display } from "@/lib/fonts";
import { todayInIST, type Period } from "@/lib/period";

/**
 * Every panel is the same 12-column grid. `minmax(0, 1fr)` rows — which is what
 * Tailwind's `grid-rows-2` expands to — are load-bearing: a bare `1fr` row
 * floors at its content height and the board grows past the viewport, which is
 * the one thing this layout exists to prevent.
 */
const PANEL = "grid min-h-0 flex-1 grid-cols-1 gap-2.5 lg:grid-cols-12 lg:gap-3";
const TWO_ROWS = "lg:grid-rows-2";

export function Dashboard({ period, data }: { period: Period; data: MonthData }) {
  // Chart.js paints to a canvas, so it needs the resolved family name — a CSS
  // variable means nothing to it. next/font gives us that at build time.
  const displayFont = display.style.fontFamily;
  const bodyFont = body.style.fontFamily;

  const { expenses } = data;
  const totalPaise = totalSpendPaise(expenses);
  const verticals = byVertical(expenses);
  const daily = byDayPaise(expenses, period.daysInMonth);
  const weekly = byWeek(expenses, period).map(({ label, amountPaise }) => ({
    label,
    amountPaise,
  }));
  const subtypes = topSubtypes(expenses, 8);

  // Which day it is, when the period being shown contains it — the calendar
  // must not strike out days that have not happened yet. Null once the period
  // is over: every day of a finished month is a day we can speak for.
  const today = todayInIST();
  const todayDay =
    today >= period.firstDay && today <= period.lastDay
      ? Number(today.slice(8, 10))
      : null;

  return (
    <main className="mx-auto flex w-full min-h-0 max-w-[1800px] flex-1 flex-col gap-2.5 p-2.5 lg:gap-3 lg:p-3">
      <KpiStrip
        period={period}
        expenses={expenses}
        previousMonthTotalPaise={data.previousMonthTotalPaise}
        todayDay={todayDay}
      />

      <TabShell
        tabs={[
          {
            id: "overview",
            label: "Overview",
            panel: (
              <div className={`${PANEL} ${TWO_ROWS}`}>
                <Tile
                  index="01"
                  title="Every rupee, to scale"
                  className="lg:col-span-8 lg:row-span-2"
                >
                  {/* Three ratios rather than one: the treemap's cells are
                      percentage-positioned, so the frame's shape decides how
                      squarify splits it, and a 1.4 frame on a phone would be a
                      row of slivers. */}
                  <Treemap expenses={expenses} ratio={1.4} fill className="hidden lg:flex" />
                  <Treemap
                    expenses={expenses}
                    ratio={1.85}
                    className="hidden md:block lg:hidden"
                  />
                  <Treemap expenses={expenses} ratio={0.78} className="md:hidden" compact />
                </Tile>

                <Tile
                  index="02"
                  title="The verticals, fixed order"
                  className="lg:col-span-4"
                >
                  <VerticalPie
                    bodyFont={bodyFont}
                    displayFont={displayFont}
                    verticals={verticals}
                    totalPaise={totalPaise}
                    fill
                  />
                </Tile>

                <Tile index="03" title="Against last month" className="lg:col-span-4">
                  {/* Focusable and named for the same reason the ledger's box
                      is: ten signed rows in a cell that holds about five, and a
                      scroll container nothing can focus cannot be reached by
                      keyboard at all — the verticals below the fold would
                      simply not exist for a keyboard reader. */}
                  <div
                    className="min-h-0 flex-1 overflow-y-auto"
                    tabIndex={0}
                    role="group"
                    aria-label="Movement against last month, by vertical — scrolls"
                  >
                    <VersusPrevious
                      expenses={expenses}
                      previousMonthByVertical={data.previousMonthByVertical}
                    />
                  </div>
                </Tile>
              </div>
            ),
          },
          {
            id: "breakdown",
            label: "Breakdown",
            panel: (
              <div className={`${PANEL} ${TWO_ROWS}`}>
                <Tile index="04" title="Spend over time" className="lg:col-span-8">
                  <SpendLine
                    bodyFont={bodyFont}
                    displayFont={displayFont}
                    daily={daily}
                    weekly={weekly}
                    hasData={totalPaise > 0}
                    fill
                  />
                </Tile>

                <Tile
                  index="05"
                  title="The month as a grid"
                  className="lg:col-span-4 lg:row-span-2"
                >
                  {/* The calendar is a grid of aspect-square cells, so its
                      height follows its width and cannot be told to fit. It
                      gets a scroll box rather than being squashed out of
                      square, which would break the ramp's read — and, like
                      every other scroll box here, one a keyboard can reach.
                      The weekday medians and the ramp key sit below the fold. */}
                  <div
                    className="min-h-0 flex-1 overflow-y-auto"
                    tabIndex={0}
                    role="group"
                    aria-label="The month as a grid, with weekday medians — scrolls"
                  >
                    <CalendarBlock period={period} expenses={expenses} todayDay={todayDay} />
                  </div>
                </Tile>

                <Tile index="06" title="Where it actually went" className="lg:col-span-8">
                  <SubtypeBars
                    bodyFont={bodyFont}
                    displayFont={displayFont}
                    subtypes={subtypes}
                    fill
                  />
                </Tile>
              </div>
            ),
          },
          {
            id: "ledger",
            label: "Ledger",
            panel: (
              <div className={PANEL}>
                <Tile index="07" title="The ledger" className="lg:col-span-12">
                  <Ledger expenses={expenses} fill />
                </Tile>
              </div>
            ),
          },
        ]}
      />
    </main>
  );
}
