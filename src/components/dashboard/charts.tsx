"use client";

import { useState } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";

import "@/lib/chart-setup";
import { formatPaise, formatPaiseCompact } from "@/lib/money";
import { merchantGroup, PALETTES, slotOf, type Palette } from "@/lib/palette";
import { useTheme } from "@/lib/theme";
import {
  byDayPaise,
  byGroup,
  byWeek,
  DAYS_IN_MONTH,
  topMerchants,
  totalSpendPaise,
} from "@/lib/transactions";

import { EmptyPlot } from "./empty";

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
 * Plot frames. Chart.js needs a parent with a definite height (design-system
 * §5.4); an aspect ratio gives it one derived from the width instead of frozen
 * in pixels, so a plot reflows with its column rather than at a breakpoint.
 *
 * The `min-h` floors are not a hedge. At `lg` the 12-column grid takes over and
 * these columns get *narrower* than they were when stacked — the line plot goes
 * from a 720px column at 768px wide to a 537px one at 1024px — so a pure ratio
 * would squash a time series to 244px exactly where there is most room on the
 * page. The floors are the heights these plots had before, in rem so they track
 * the type they have to stay legible against; the ratio takes over above them.
 */
const LINE_FRAME =
  "aspect-[6/5] sm:aspect-[16/9] lg:aspect-[11/5] min-h-[17.5rem] sm:min-h-[21.25rem]";
const BAR_FRAME =
  "aspect-square sm:aspect-[3/2] lg:aspect-[4/3] min-h-[21.25rem] sm:min-h-[25rem]";

/**
 * A canvas has no CSS, so the responsive rules have to be arithmetic here.
 * These are all *ratios* — of the plot's own width, or of the gutter — so the
 * chart looks the same at any size instead of at one size.
 */
/** Share of the bar plot reserved for the value printed past each bar. */
const VALUE_GUTTER = 0.24;
/** Gap between the bar's end and its value, as a share of that gutter. */
const VALUE_OFFSET = 0.1;
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

/**
 * The largest size, within the legibility bounds, at which every label fits the
 * space available. Measuring beats assuming: the reserve used to be a constant
 * that was correct for a rupee-rounded string and too small once paise arrived.
 */
function fitFontPx(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  available: number,
  family: string,
): number {
  const root = rootFontPx();
  const max = VALUE_FONT_MAX_REM * root;
  const min = VALUE_FONT_MIN_REM * root;

  ctx.font = `400 ${max}px ${family}`;
  const widest = labels.reduce((w, label) => Math.max(w, ctx.measureText(label).width), 0);
  if (widest <= available || widest === 0) return max;

  return Math.max(min, Math.floor(max * (available / widest)));
}

const share = (part: number, whole: number) =>
  whole === 0 ? "0.0" : ((part / whole) * 100).toFixed(1);

/* ------------------------------------------------------------------ pie -- */

export function GroupPie({ bodyFont, displayFont }: Fonts) {
  const { theme, P } = useChartTheme();
  const groups = byGroup();
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
      <div className="relative aspect-square w-full max-w-[20rem] min-h-0 min-w-0 shrink-0 lg:w-[38%]">
        {total === 0 ? (
          // A pie of seven zeroes draws nothing at all, which reads as a broken
          // chart rather than an empty one.
          <EmptyPlot className="h-full" />
        ) : (
          <Pie
            key={theme}
            // react-chartjs-2 puts role="img" on the canvas itself but gives it
            // no name, so without this every chart is an unlabelled graphic.
            aria-label={`Spending by group. Total ${formatPaise(total)}. ${groups
              .map(
                (e) =>
                  `${e.group}: ${formatPaise(e.amountPaise)}, ${share(e.amountPaise, total)} per cent`,
              )
              .join(". ")}`}
            data={{
              labels: groups.map((entry) => entry.group),
              datasets: [
                {
                  data: groups.map((entry) => entry.amountPaise),
                  backgroundColor: groups.map((_, i) => P.group[i]),
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
        {groups.map((entry, i) => (
          <li
            key={entry.group}
            className="border-grid flex items-center gap-3 border-b py-2"
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
              {entry.group}
            </span>
            {/* With nothing wired up, "₹0" and "0.0%" beside a "No transactions
                yet" plot would assert we checked and the group is empty. We did
                not check anything. */}
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
                  borderColor: P.group[4],
                  borderWidth: 3,
                  tension: 0,
                  fill: true,
                  backgroundColor: `${P.group[4]}29`, // 16% — the area wash
                  pointStyle: "rect",
                  pointRadius: isDaily ? 0 : 7,
                  pointHoverRadius: 7,
                  pointBackgroundColor: P.group[4],
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

export function MerchantBars({ bodyFont, displayFont }: Fonts) {
  const { theme, P } = useChartTheme();
  const merchants = topMerchants(8);
  const slots = merchants.map((entry) => slotOf(merchantGroup(entry.merchant)));
  const legend = [...new Set(slots)];
  const groupNames = merchants.map((entry) => merchantGroup(entry.merchant));

  if (merchants.length === 0) {
    return <EmptyPlot className={BAR_FRAME} label="No merchants yet" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`border-rule bg-card relative w-full min-h-0 min-w-0 border-2 p-2 ${BAR_FRAME}`}
      >
        <Bar
          key={theme}
          aria-label={`Top ${merchants.length} merchants by spend. ${merchants
            .map((e, i) => `${e.merchant}, ${groupNames[i]}: ${formatPaise(e.amountPaise)}`)
            .join(". ")}`}
          data={{
            labels: merchants.map((entry) => entry.merchant.toUpperCase()),
            datasets: [
              {
                label: "Spend",
                data: merchants.map((entry) => entry.amountPaise),
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
            // Room for the value drawn past the end of each bar, as a share of
            // the plot rather than a pixel count — this chart is a 5/12 column
            // at lg and full width below it, so any fixed reserve is wrong at
            // one of the two. The `barValues` plugin fits its type to whatever
            // this leaves it, so the two cannot disagree.
            layout: {
              padding: (ctx) => ({
                right: Math.round((ctx.chart?.width ?? 0) * VALUE_GUTTER),
              }),
            },
            plugins: {
              legend: { display: false }, // named swatches sit under the chart
              tooltip: {
                ...tooltipStyle(P, bodyFont),
                callbacks: {
                  label: (ctx) =>
                    `${formatPaise(ctx.parsed.x ?? 0)} · ${groupNames[ctx.dataIndex]}`,
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
                const raw = chart.data.datasets[0]?.data ?? [];
                const { ctx } = chart;
                const labels = raw.map((value) => formatPaise(Number(value ?? 0)));
                const gutter = chart.width * VALUE_GUTTER;
                const offset = gutter * VALUE_OFFSET;

                ctx.save();
                ctx.fillStyle = P.ink;
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                // Shrink to whatever the reserved gutter actually allows, so a
                // long figure cannot run off the canvas the way a fixed size
                // would. Bounded below, because an unreadable label is no
                // better than a clipped one.
                ctx.font = `400 ${fitFontPx(ctx, labels, gutter - offset, displayFont)}px ${displayFont}`;
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
            <span className={MICRO}>{byGroup()[slot].group}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
