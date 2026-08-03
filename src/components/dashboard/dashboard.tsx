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
 */

import { CalendarBlock } from "@/components/dashboard/calendar";
import { SpendLine, SubtypeBars, VerticalPie } from "@/components/dashboard/charts";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { Ledger } from "@/components/dashboard/ledger";
import { TabShell } from "@/components/dashboard/tab-shell";
import { Tile } from "@/components/dashboard/tile";
import { Treemap } from "@/components/dashboard/treemap";
import { VersusPrevious } from "@/components/dashboard/versus-previous";
import { body, display } from "@/lib/fonts";

/**
 * Every panel is the same 12-column grid. `minmax(0, 1fr)` rows — which is what
 * Tailwind's `grid-rows-2` expands to — are load-bearing: a bare `1fr` row
 * floors at its content height and the board grows past the viewport, which is
 * the one thing this layout exists to prevent.
 */
const PANEL = "grid min-h-0 flex-1 grid-cols-1 gap-2.5 lg:grid-cols-12 lg:gap-3";
const TWO_ROWS = "lg:grid-rows-2";

export function Dashboard() {
  // Chart.js paints to a canvas, so it needs the resolved family name — a CSS
  // variable means nothing to it. next/font gives us that at build time.
  const displayFont = display.style.fontFamily;
  const bodyFont = body.style.fontFamily;

  return (
    <main className="mx-auto flex w-full min-h-0 max-w-[1800px] flex-1 flex-col gap-2.5 p-2.5 lg:gap-3 lg:p-3">
      <KpiStrip />

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
                  <Treemap ratio={1.4} fill className="hidden lg:flex" />
                  <Treemap ratio={1.85} className="hidden md:block lg:hidden" />
                  <Treemap ratio={0.78} className="md:hidden" compact />
                </Tile>

                <Tile
                  index="02"
                  title="The verticals, fixed order"
                  className="lg:col-span-4"
                >
                  <VerticalPie bodyFont={bodyFont} displayFont={displayFont} fill />
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
                    <VersusPrevious />
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
                  <SpendLine bodyFont={bodyFont} displayFont={displayFont} fill />
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
                    <CalendarBlock />
                  </div>
                </Tile>

                <Tile index="06" title="Where it actually went" className="lg:col-span-8">
                  <SubtypeBars bodyFont={bodyFont} displayFont={displayFont} fill />
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
                  <Ledger fill />
                </Tile>
              </div>
            ),
          },
        ]}
      />
    </main>
  );
}
