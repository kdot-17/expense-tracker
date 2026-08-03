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
import { BAR_FRAME, LINE_FRAME } from "./frames";

type Fonts = { bodyFont: string; displayFont: string };

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
    titleFont: { family: bodyFont, size: remPx(AXIS_NAME_REM), weight: 700 as const },
    bodyFont: { family: bodyFont, size: remPx(TOOLTIP_BODY_REM) },
  };
}

const MICRO = "text-micro font-semibold uppercase tracking-[0.18em] text-muted";

/**
 * A canvas has no CSS, so the responsive rules have to be arithmetic here.
 */
/** Gap between a bar's end and its value, in rem so it follows the reader. */
const VALUE_OFFSET_REM = 0.625;
/** The most of the plot the value column may take, however long the figures. */
const VALUE_GUTTER_MAX = 0.24;
/** Legibility floor and ceiling, in rem — never px, so they follow the reader. */
const VALUE_FONT_MIN_REM = 0.6875;
const VALUE_FONT_MAX_REM = 0.9375;

/** The root font size in px — the bridge from the CSS rem world to the canvas. */
function rootFontPx(): number {
  if (typeof document === "undefined") return 16;
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

/**
 * Canvas type, expressed in rem and resolved to px at draw time, so the charts
 * follow the reader's browser font setting exactly as the markup does. Chart.js
 * only accepts a number, which is why this conversion has to be explicit.
 */
const remPx = (rem: number) => Math.round(rem * rootFontPx());

/** Matches the --text-tick / --text-meta / --text-note steps in globals.css. */
const TICK_REM = 0.6875;
const AXIS_NAME_REM = 0.75;
const TOOLTIP_BODY_REM = 0.8125;

/** The bits of a Chart.js chart the value column needs, and nothing else. */
type Plot = {
  width: number;
  ctx: CanvasRenderingContext2D;
  data: { datasets: { data: unknown[] }[] };
};

/**
 * The value column past the end of the bars: how wide it has to be, what size
 * its type can be, and the labels themselves — one function, because the space
 * *reserved* and the space *drawn into* have to be the same number, and two
 * functions agreeing by convention is how they stop agreeing.
 *
 * Measured from the widest figure rather than taken as a share of the plot. A
 * share is right at exactly one width: reserving 24% hands a full-bleed plot
 * 229px for a 75px figure, which loses an eighth of the canvas and shortens
 * every bar with it. So ask the text what it needs, and cap that, so a long
 * figure cannot eat a narrow plot instead. Only when the cap bites does the
 * type shrink — which is the case that used to clip.
 *
 * Labels come off the `chart` argument, never a closure: an inline plugin is
 * captured once at construction (design-system §5.2) and a closed-over array
 * would still be the first render's numbers.
 */
function valueColumn(plot: Plot, family: string) {
  const raw = plot.data.datasets[0]?.data ?? [];
  const root = rootFontPx();
  const max = VALUE_FONT_MAX_REM * root;
  const min = VALUE_FONT_MIN_REM * root;
  const offset = remPx(VALUE_OFFSET_REM);
  const cap = plot.width * VALUE_GUTTER_MAX;

  const widestAt = (labels: string[], px: number) => {
    const before = plot.ctx.font;
    plot.ctx.font = `400 ${px}px ${family}`;
    const w = labels.reduce((m, label) => Math.max(m, plot.ctx.measureText(label).width), 0);
    plot.ctx.font = before;
    return w;
  };

  // Exact first, abbreviated only if exact cannot be made to fit. Shrinking is
  // bounded below — an unreadable figure is no better than a clipped one — so
  // on a phone the widest amount the schema can hold still runs past the cap at
  // the floor. That is the case the compact form exists for, the same split the
  // treemap and the calendar make: `₹214.7L` is honest, `₹2,14,74,8` is a
  // different number. The exact amount is always in the tooltip.
  for (const format of [formatPaise, formatPaiseCompact]) {
    const labels = raw.map((value) => format(Number(value ?? 0)));
    const widest = widestAt(labels, max);
    if (offset + widest <= cap || widest === 0) {
      return { labels, offset, gutter: Math.ceil(offset + widest), fontPx: max };
    }
    const fontPx = Math.max(min, Math.floor(max * ((cap - offset) / widest)));
    if (widestAt(labels, fontPx) <= cap - offset) {
      return { labels, offset, gutter: Math.ceil(cap), fontPx };
    }
  }

  // Compact at the floor: shorter than anything `amount_paise` can reach.
  return {
    labels: raw.map((value) => formatPaiseCompact(Number(value ?? 0))),
    offset,
    gutter: Math.ceil(cap),
    fontPx: min,
  };
}

const share = (part: number, whole: number) =>
  whole === 0 ? "0.0" : ((part / whole) * 100).toFixed(1);

/* ------------------------------------------------------------------ pie -- */

export function VerticalPie({ bodyFont, displayFont }: Fonts) {
  const { theme, P } = useChartTheme();
  const verticals = byVertical();
  const total = totalSpendPaise();

  return (
    // `flex-wrap` with a real basis on the legend, so when the row cannot hold
    // both the legend drops beneath the pie instead of being crushed. It used
    // to keep its place and surrender its width: at a 7/12 column the name
    // column collapsed to a few pixels and every group read as an ellipsis.
    <div className="flex flex-col gap-6 lg:flex-row lg:flex-wrap lg:items-center">
      {/* A pie is circular, so its frame is square at every width. It takes a
          share of the row rather than a fixed width, capped once it is as big
          as it needs to be. */}
      {/* All three bounds have to be live, and the share is what sets that. At
          45% the pie grows from its 17.5rem floor to its 20rem cap across the
          `lg` range: 45% of the 7/12 column is 242px at 1024px (floored to
          280px, and the legend wraps underneath — which is what `flex-wrap` is
          there for) and 330px at the 85rem page cap, where the 20rem cap takes
          over at 320px. A smaller share never reaches the cap at any viewport,
          which pins the pie to its floor and leaves it *smaller* on a desktop
          than on a phone, where it is already 320px. */}
      <div className="relative aspect-square w-full max-w-[20rem] min-h-0 min-w-0 shrink-0 lg:w-[45%] lg:min-w-[17.5rem]">
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
      <ol className="border-rule min-w-0 flex-1 basis-[18rem] border-t-2">
        {verticals.map((entry, i) => (
          <li
            key={entry.vertical}
            className="border-grid flex items-center gap-3 border-b py-1.5"
          >
            <span className={`${MICRO} w-6 shrink-0 tabular-nums`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              aria-hidden
              className="border-rule size-4 shrink-0 border-2"
              style={{ background: `var(--slot-${i})` }}
            />
            <span className="text-ink text-note min-w-0 flex-1 truncate font-medium">
              {entry.vertical}
            </span>
            {/* With nothing wired up, "₹0" and "0.0%" beside a "No expenses
                yet" plot would assert we checked and the vertical is empty. We
                did not check anything. */}
            <span
              className="text-ink text-lede shrink-0 tabular-nums"
              style={{ fontFamily: displayFont }}
            >
              {total === 0 ? "—" : formatPaise(entry.amountPaise)}
            </span>
            <span className="text-ink-2 text-meta w-12 shrink-0 text-right tabular-nums">
              {total === 0 ? "" : `${share(entry.amountPaise, total)}%`}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------------- line -- */

type Grain = "daily" | "weekly";

export function SpendLine({ bodyFont }: Fonts) {
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
    <div className="flex flex-col gap-4">
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
                className={`border-rule text-tick -ml-0.5 border-2 px-4 py-1.5 font-semibold tracking-[0.18em] uppercase focus-visible:relative focus-visible:z-10 ${
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
          className={`border-rule bg-card relative w-full min-h-0 min-w-0 border-2 p-2 ${LINE_FRAME}`}
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
                    font: { family: bodyFont, size: remPx(TICK_REM) },
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
                    font: { family: bodyFont, size: remPx(TICK_REM) },
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

export function SubtypeBars({ bodyFont, displayFont }: Fonts) {
  const { theme, P } = useChartTheme();
  const subtypes = topSubtypes(8);
  const slots = subtypes.map((entry) => slotOf(entry.vertical));
  // Which verticals are actually on this axis — a legend row for one that is
  // not drawn would document an encoding the reader cannot see.
  const legend = [...new Set(slots)];

  if (subtypes.length === 0) {
    return <EmptyPlot className={BAR_FRAME} label="No subtypes yet" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`border-rule bg-card relative w-full min-h-0 min-w-0 border-2 p-2 ${BAR_FRAME}`}
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
            // Room for the value drawn past the end of each bar — exactly what
            // the widest figure measures, capped. This chart is a 5/12 column
            // at lg and full width below it, and neither a fixed pixel count
            // nor a fixed share is right at both: the first clips the narrow
            // one, the second strands a quarter of the wide one. `barValues`
            // below reserves through the same function, so the two cannot
            // disagree by construction rather than by agreement.
            layout: {
              padding: (ctx) => ({
                right: ctx.chart ? valueColumn(ctx.chart, displayFont).gutter : 0,
              }),
            },
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
                  font: { family: bodyFont, size: remPx(TICK_REM) },
                  maxTicksLimit: 5,
                  callback: (value) => formatPaiseCompact(Number(value)),
                },
              },
              y: {
                grid: { display: false },
                border: { color: P.rule, width: 2 },
                ticks: {
                  color: P.ink,
                  font: { family: bodyFont, size: remPx(AXIS_NAME_REM), weight: 700 },
                },
              },
            },
          }}
          plugins={[
            {
              id: "barValues",
              afterDatasetsDraw(chart) {
                const meta = chart.getDatasetMeta(0);
                const { ctx } = chart;
                // The same call `layout.padding` made, so the figure is drawn
                // into precisely the column that was reserved for it.
                const { labels, offset, fontPx } = valueColumn(chart, displayFont);

                ctx.save();
                ctx.fillStyle = P.ink;
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.font = `400 ${fontPx}px ${displayFont}`;
                meta.data.forEach((bar, i) => {
                  ctx.fillText(labels[i] ?? "", bar.x + offset, bar.y + 1);
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
