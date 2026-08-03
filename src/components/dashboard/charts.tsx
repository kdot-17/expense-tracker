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
    titleFont: { family: bodyFont, size: 12, weight: 700 as const },
    bodyFont: { family: bodyFont, size: 13 },
  };
}

const MICRO = "text-[10px] font-semibold uppercase tracking-[0.18em] text-muted";

const share = (part: number, whole: number) =>
  whole === 0 ? "0.0" : ((part / whole) * 100).toFixed(1);

/* ------------------------------------------------------------------ pie -- */

export function GroupPie({ bodyFont, displayFont }: Fonts) {
  const { theme, P } = useChartTheme();
  const groups = byGroup();
  const total = totalSpendPaise();

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
      <div className="relative h-[260px] w-full min-h-0 min-w-0 shrink-0 sm:h-[320px] lg:w-[320px]">
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
      <ol className="border-rule min-w-0 flex-1 border-t-2">
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
            <span className="text-ink min-w-0 flex-1 truncate text-[13px] font-medium">
              {entry.group}
            </span>
            {/* With nothing wired up, "₹0" and "0.0%" beside a "No transactions
                yet" plot would assert we checked and the group is empty. We did
                not check anything. */}
            <span
              className="text-ink shrink-0 text-[15px] tabular-nums"
              style={{ fontFamily: displayFont }}
            >
              {total === 0 ? "—" : formatPaise(entry.amountPaise)}
            </span>
            <span className="text-ink-2 w-12 shrink-0 text-right text-[12px] tabular-nums">
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
        <div className="border-rule bg-card relative h-[280px] w-full min-h-0 min-w-0 border-2 p-2 sm:h-[340px]">
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

export function MerchantBars({ bodyFont, displayFont }: Fonts) {
  const { theme, P } = useChartTheme();
  const merchants = topMerchants(8);
  const slots = merchants.map((entry) => slotOf(merchantGroup(entry.merchant)));
  const legend = [...new Set(slots)];
  const groupNames = merchants.map((entry) => merchantGroup(entry.merchant));

  if (merchants.length === 0) {
    return <EmptyPlot className="h-[340px] sm:h-[400px]" label="No merchants yet" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-rule bg-card relative h-[340px] w-full min-h-0 min-w-0 border-2 p-2 sm:h-[400px]">
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
            // Room for the value drawn past the end of each bar. Sized for a
            // full paise figure — `₹1,23,456.78`, not `₹1,23,457`.
            layout: { padding: { right: 92 } },
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
            <span className={MICRO}>{byGroup()[slot].group}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
