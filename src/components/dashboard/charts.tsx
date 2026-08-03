"use client";

import { useState } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";

import "@/lib/chart-setup";
import {
  byDayPaise,
  byVertical,
  byWeek,
  DAYS_IN_MONTH,
  topSubtypes,
  totalSpendPaise,
} from "@/lib/expenses";
import { formatPaise, formatPaiseCompact } from "@/lib/money";
import { PALETTES, type Palette } from "@/lib/palette";
import { slotOf, subtypeLabel } from "@/lib/taxonomy";
import { useTheme } from "@/lib/theme";

import { EmptyPlot } from "./empty";

type Fonts = { bodyFont: string; displayFont: string };

/**
 * `fill` swaps a module's fixed chart height for one that grows into whatever
 * the parent gives it — the board deals each module a grid cell rather than
 * letting it pick its own height. Per the design system's sizing rule, filling
 * still needs `min-h-0` on every flex ancestor or the canvas floors at content
 * height and can never shrink.
 *
 * `FLOOR` is the other half of it, and the half that is easy to miss: the
 * board's rows are only a definite height at `lg`. Below that the grid is one
 * auto-sized column, `flex-1` has nothing to resolve against, and the module
 * collapses to its padding — the subtype chart came out 70px tall on a phone.
 * So the fixed height comes back below `lg` as a floor, and is dropped again at
 * `lg` where the row height is the authority and a floor would push the board
 * past the viewport on a short screen.
 */
type Fillable = { fill?: boolean };

const FLOOR = "max-lg:min-h-[300px]";

/**
 * Chart.js captures inline plugins at construction and never swaps them, so a
 * plugin that closes over the palette keeps painting the last theme's ink
 * forever. Keying every chart on the theme name forces a clean rebuild instead
 * of trying to mutate colours in place. Animation is off, so it is invisible.
 */
function useChartTheme() {
  const theme = useTheme();
  return { theme, P: PALETTES[theme] };
}

/** Solid block, square corners, inverted type. The tooltip is part of the poster. */
function tooltipStyle(P: Palette, bodyFont: string) {
  return {
    backgroundColor: P.ink,
    titleColor: P.page,
    bodyColor: P.page,
    borderColor: P.ink,
    borderWidth: 2,
    cornerRadius: 0,
    padding: 10,
    displayColors: false,
    titleFont: { family: bodyFont, size: 12, weight: 700 as const },
    bodyFont: { family: bodyFont, size: 13 },
  };
}

const MICRO = "text-[10px] font-semibold uppercase tracking-[0.18em] text-muted";

const share = (part: number, whole: number) =>
  whole === 0 ? "0.0" : ((part / whole) * 100).toFixed(1);

/* ------------------------------------------------------------------ pie -- */

export function VerticalPie({ bodyFont, displayFont, fill = false }: Fonts & Fillable) {
  const { theme, P } = useChartTheme();
  const verticals = byVertical();
  const total = totalSpendPaise();

  return (
    <div
      className={
        fill
          ? // `items-stretch`, not `items-center`. Centring makes the legend
            // size to its content and overflow both ends of a shorter cell,
            // and its own `overflow-y-auto` never engages because nothing
            // constrains its height — ten rows clipped top and bottom, with no
            // way to scroll to either.
            "flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch"
          : "flex flex-col gap-6 lg:flex-row lg:items-center"
      }
    >
      <div
        className={`relative w-full min-h-0 min-w-0 shrink-0 ${
          fill
            ? `flex-1 ${FLOOR} lg:h-full lg:w-[40%] lg:flex-none`
            : "h-[260px] sm:h-[320px] lg:w-[320px]"
        }`}
      >
        {total === 0 ? (
          // A pie of ten zeroes draws nothing at all, which reads as a broken
          // chart rather than an empty one.
          <EmptyPlot className="h-full" />
        ) : (
          <Pie
            key={theme}
            // react-chartjs-2 puts role="img" on the canvas itself but gives it
            // no name, so without this every chart is an unlabelled graphic.
            aria-label={`Spending by vertical. Total ${formatPaise(total)}. ${verticals
              .map(
                (e) =>
                  `${e.vertical}: ${formatPaise(e.amountPaise)}, ${share(
                    e.amountPaise,
                    total,
                  )} per cent`,
              )
              .join(". ")}`}
            data={{
              labels: verticals.map((entry) => entry.vertical),
              datasets: [
                {
                  data: verticals.map((entry) => entry.amountPaise),
                  backgroundColor: verticals.map((_, i) => P.group[i]),
                  borderColor: P.rule,
                  borderWidth: 2,
                  hoverBorderColor: P.rule,
                  hoverBorderWidth: 6,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: {
                // Replaced by the numbered list beside it, which also carries
                // the amounts — no slice depends on colour to be identified.
                // At ten slices that list is doing most of the work.
                legend: { display: false },
                tooltip: {
                  ...tooltipStyle(P, bodyFont),
                  callbacks: {
                    label: (ctx) =>
                      `${formatPaise(ctx.parsed ?? 0)} · ${share(ctx.parsed ?? 0, total)}%`,
                  },
                },
              },
            }}
          />
        )}
      </div>

      {/* The legend is the table. It stands on its own with no chart. */}
      <ol
        // In fill mode the list genuinely scrolls — ten rows in a cell that
        // holds about eight — so it needs the same treatment as the ledger's
        // scroll box: a scroll container nothing can focus is unreachable by
        // keyboard, and the verticals below the fold simply cannot be read.
        {...(fill
          ? {
              tabIndex: 0,
              role: "group" as const,
              "aria-label": "Spending by vertical, in fixed order — scrolls",
            }
          : {})}
        className={`border-rule min-w-0 flex-1 border-t-2 ${
          fill ? "min-h-0 overflow-y-auto" : ""
        }`}
      >
        {verticals.map((entry, i) => (
          <li
            key={entry.vertical}
            className="border-grid flex items-center gap-3 border-b py-1.5"
          >
            {/* The index and the share are dropped in fill mode. The board
                gives this legend about 200px, and `w-6` + `w-12` + two more
                gaps of fixed width ate the whole row: the name is `flex-1`, so
                it resolved to 0px and ten slices rendered as coloured swatches
                with no names at all — the one thing the palette rules forbid.
                Neither column is load-bearing here. The order is frozen, so the
                number is decoration, and the pie sitting beside the row already
                encodes the share as an angle. Name and amount stay. */}
            {fill ? null : (
              <span className={`${MICRO} w-6 shrink-0 tabular-nums`}>
                {String(i + 1).padStart(2, "0")}
              </span>
            )}
            <span
              aria-hidden
              className="border-rule size-4 shrink-0 border-2"
              style={{ background: `var(--slot-${i})` }}
            />
            <span
              // A name that still has to truncate at the narrowest board width
              // stays recoverable rather than simply being lost.
              title={entry.vertical}
              className="text-ink min-w-0 flex-1 truncate text-[13px] font-medium"
            >
              {entry.vertical}
            </span>
            {/* With nothing wired up, "₹0" and "0.0%" beside a "No expenses
                yet" plot would assert we checked and the vertical is empty. We
                did not check anything. */}
            <span
              className="text-ink shrink-0 text-[15px] tabular-nums"
              style={{ fontFamily: displayFont }}
            >
              {total === 0 ? "—" : formatPaise(entry.amountPaise)}
            </span>
            {fill ? null : (
              <span className="text-ink-2 w-12 shrink-0 text-right text-[12px] tabular-nums">
                {total === 0 ? "" : `${share(entry.amountPaise, total)}%`}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------------- line -- */

type Grain = "daily" | "weekly";

export function SpendLine({ bodyFont, fill = false }: Fonts & Fillable) {
  const { theme, P } = useChartTheme();
  const [grain, setGrain] = useState<Grain>("daily");
  const daily = byDayPaise();
  const weekly = byWeek();
  const isDaily = grain === "daily";
  const hasData = totalSpendPaise() > 0;

  const labels = isDaily
    ? daily.map((_, i) => String(i + 1))
    : weekly.map((week) => week.label);
  const values = isDaily ? daily : weekly.map((week) => week.amountPaise);

  return (
    <div className={fill ? "flex min-h-0 flex-1 flex-col gap-3" : "flex flex-col gap-4"}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className={MICRO}>
          {isDaily
            ? `${DAYS_IN_MONTH} days`
            : `${weekly.length} calendar weeks · Mon start`}
        </p>
        <div role="group" aria-label="Granularity" className="flex">
          {(["daily", "weekly"] as const).map((option) => {
            const active = grain === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setGrain(option)}
                aria-pressed={active}
                className={`border-rule -ml-0.5 border-2 px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase focus-visible:relative focus-visible:z-10 ${
                  active ? "bg-rule text-page" : "text-ink bg-transparent"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {hasData ? (
        <div
          className={`border-rule bg-card relative w-full min-h-0 min-w-0 border-2 p-2 ${
            fill ? `flex-1 ${FLOOR}` : "h-[280px] sm:h-[340px]"
          }`}
        >
          <Line
            key={theme}
            aria-label={`Spend per ${isDaily ? "day" : "week"}. ${labels
              .map((l, i) => `${isDaily ? `Day ${l}` : l}: ${formatPaise(values[i] ?? 0)}`)
              .join(". ")}`}
            data={{
              labels,
              datasets: [
                {
                  label: isDaily ? "Spend per day" : "Spend per week",
                  data: values,
                  // The ramp's top step, NOT a categorical slot. This series is
                  // total spend over time — it belongs to no vertical, so
                  // borrowing a slot hue would tell a reader who has just
                  // learned "sky blue is Loans" that this line is about Loans.
                  // The ramp is the design's magnitude encoding, which is what
                  // this is, and it ties the line to the calendar beside it.
                  borderColor: P.ramp[4],
                  borderWidth: 3,
                  tension: 0,
                  fill: true,
                  backgroundColor: `${P.ramp[4]}29`, // 16% — the area wash
                  pointStyle: "rect",
                  pointRadius: isDaily ? 0 : 7,
                  pointHoverRadius: 7,
                  pointBackgroundColor: P.ramp[4],
                  pointBorderColor: P.rule,
                  pointBorderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              interaction: { mode: "index", intersect: false },
              plugins: {
                legend: { display: false }, // one series, directly titled above
                tooltip: {
                  ...tooltipStyle(P, bodyFont),
                  callbacks: {
                    title: (items) =>
                      isDaily ? `Day ${items[0].label}` : `Days ${items[0].label}`,
                    label: (ctx) =>
                      (ctx.parsed.y ?? 0) === 0
                        ? "No spending"
                        : formatPaise(ctx.parsed.y ?? 0),
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  border: { color: P.rule, width: 2 },
                  ticks: {
                    color: P.muted,
                    font: { family: bodyFont, size: 11 },
                    maxRotation: 0,
                    autoSkipPadding: 10,
                  },
                },
                y: {
                  beginAtZero: true, // area chart: zero or nothing
                  grid: { color: P.grid },
                  border: { color: P.rule, width: 2 },
                  ticks: {
                    color: P.muted,
                    font: { family: bodyFont, size: 11 },
                    maxTicksLimit: 5,
                    callback: (value) => formatPaiseCompact(Number(value)),
                  },
                },
              },
            }}
          />
        </div>
      ) : (
        <EmptyPlot />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ bar -- */

export function SubtypeBars({ bodyFont, displayFont, fill = false }: Fonts & Fillable) {
  const { theme, P } = useChartTheme();
  const subtypes = topSubtypes(8);
  const slots = subtypes.map((entry) => slotOf(entry.vertical));
  // Which verticals are actually on this axis — a legend row for one that is
  // not drawn would document an encoding the reader cannot see.
  const legend = [...new Set(slots)];

  if (subtypes.length === 0) {
    return (
      <EmptyPlot
        className={fill ? `min-h-0 flex-1 ${FLOOR}` : "h-[340px] sm:h-[400px]"}
        label="No subtypes yet"
      />
    );
  }

  return (
    <div className={fill ? "flex min-h-0 flex-1 flex-col gap-3" : "flex flex-col gap-4"}>
      <div
        className={`border-rule bg-card relative w-full min-h-0 min-w-0 border-2 p-2 ${
          fill ? `flex-1 ${FLOOR}` : "h-[340px] sm:h-[400px]"
        }`}
      >
        <Bar
          key={theme}
          aria-label={`Top ${subtypes.length} subtypes by spend. ${subtypes
            .map(
              (e) =>
                `${e.name}, ${e.vertical}: ${formatPaise(e.amountPaise)}`,
            )
            .join(". ")}`}
          data={{
            labels: subtypes.map((entry) => subtypeLabel(entry).toUpperCase()),
            datasets: [
              {
                label: "Spend",
                data: subtypes.map((entry) => entry.amountPaise),
                backgroundColor: slots.map((slot) => P.group[slot]),
                borderColor: P.rule,
                borderWidth: 2,
                hoverBorderWidth: 2,
                barPercentage: 0.86,
                categoryPercentage: 0.94,
              },
            ],
          }}
          options={{
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            // Room for the value drawn past the end of each bar. Sized for a
            // full paise figure — `₹1,23,456.78`, not `₹1,23,457`.
            layout: { padding: { right: 92 } },
            plugins: {
              legend: { display: false }, // named swatches sit under the chart
              tooltip: {
                ...tooltipStyle(P, bodyFont),
                callbacks: {
                  label: (ctx) =>
                    `${formatPaise(ctx.parsed.x ?? 0)} · ${
                      subtypes[ctx.dataIndex]?.vertical ?? ""
                    }`,
                },
              },
            },
            scales: {
              x: {
                beginAtZero: true, // bars: always
                grid: { color: P.grid },
                border: { color: P.rule, width: 2 },
                ticks: {
                  color: P.muted,
                  font: { family: bodyFont, size: 11 },
                  maxTicksLimit: 5,
                  callback: (value) => formatPaiseCompact(Number(value)),
                },
              },
              y: {
                grid: { display: false },
                border: { color: P.rule, width: 2 },
                ticks: {
                  color: P.ink,
                  font: { family: bodyFont, size: 12, weight: 700 },
                },
              },
            },
          }}
          plugins={[
            {
              id: "barValues",
              afterDatasetsDraw(chart) {
                const meta = chart.getDatasetMeta(0);
                const raw = chart.data.datasets[0]?.data ?? [];
                const { ctx } = chart;
                ctx.save();
                ctx.fillStyle = P.ink;
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.font = `400 13px ${displayFont}`;
                meta.data.forEach((bar, i) => {
                  ctx.fillText(formatPaise(Number(raw[i] ?? 0)), bar.x + 10, bar.y + 1);
                });
                ctx.restore();
              },
            },
          ]}
        />
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {legend.map((slot) => (
          <li key={slot} className="flex items-center gap-2">
            <span
              aria-hidden
              className="border-rule size-3.5 border-2"
              style={{ background: `var(--slot-${slot})` }}
            />
            <span className={MICRO}>{byVertical()[slot].vertical}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
