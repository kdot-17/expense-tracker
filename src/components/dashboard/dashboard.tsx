import { CalendarBlock } from "@/components/dashboard/calendar";
import { GroupPie, MerchantBars, SpendLine } from "@/components/dashboard/charts";
import { Ledger } from "@/components/dashboard/ledger";
import { Treemap } from "@/components/dashboard/treemap";
import { VersusPrevious } from "@/components/dashboard/versus-previous";
import { body, display } from "@/lib/fonts";
import { formatPaise } from "@/lib/money";
import {
  DAYS_IN_MONTH,
  MONTH_LABEL,
  PREVIOUS_MONTH_TOTAL_PAISE,
  stats,
} from "@/lib/transactions";

const MICRO = "text-[10px] font-semibold uppercase tracking-[0.2em]";
const DASH = "—";

function SectionHead({
  index,
  title,
  note,
}: {
  index: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="border-rule flex flex-col gap-2 border-b-2 pb-3">
      <div className="flex items-baseline gap-3">
        <span className={`${MICRO} text-muted shrink-0 tabular-nums`}>{index}</span>
        <h2 className="font-display text-[clamp(1.35rem,3.4vw,2.35rem)] leading-[0.9] tracking-[-0.01em] uppercase">
          {title}
        </h2>
      </div>
      {note ? (
        <p className="text-ink-2 max-w-[74ch] text-[13px] leading-relaxed">{note}</p>
      ) : null}
    </div>
  );
}

export function Dashboard() {
  const s = stats();
  const hasData = s.debits > 0;
  const hasPrevious = PREVIOUS_MONTH_TOTAL_PAISE > 0;

  // Chart.js paints to a canvas, so it needs the resolved family name — a CSS
  // variable means nothing to it. next/font gives us that at build time.
  const displayFont = display.style.fontFamily;
  const bodyFont = body.style.fontFamily;

  const rail = [
    {
      label: "Median day",
      value: hasData ? formatPaise(s.medianDayPaise) : DASH,
      note: "Across the days money actually moved.",
    },
    {
      label: "Busiest day",
      value: s.busiestDay ? String(s.busiestDay) : DASH,
      note: "The single heaviest day of the month.",
    },
    {
      label: "Largest debit",
      value: s.largest ? formatPaise(s.largest.amountPaise) : DASH,
      note: s.largest ? s.largest.merchant : "No transactions recorded.",
    },
    {
      label: "Quiet days",
      value: hasData ? String(s.quietDays) : DASH,
      note: `Days out of ${DAYS_IN_MONTH} with nothing on them.`,
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-10 px-4 py-8 sm:px-6 lg:gap-14 lg:px-10 lg:py-12">
      {/* ------------------------------------------------------- headline -- */}
      <header className="border-rule bg-card grid grid-cols-1 border-2 lg:grid-cols-12">
        <div className="border-rule border-b-2 p-5 sm:p-8 lg:col-span-7 lg:border-r-2 lg:border-b-0">
          <p className={`${MICRO} text-muted`}>{MONTH_LABEL} · one account</p>
          <h1 className="font-display mt-4 text-[clamp(2.6rem,9.2vw,6.4rem)] leading-[0.82] tracking-[-0.02em] uppercase">
            Where the
            <br />
            money went
          </h1>
          <p className="text-ink-2 mt-5 max-w-[52ch] text-[14px] leading-relaxed sm:text-[15px]">
            Every debit for the month, grouped seven ways and shown to scale.
          </p>
        </div>

        <div
          className="flex flex-col justify-between gap-6 p-5 sm:p-8 lg:col-span-5"
          style={{ background: "var(--slot-0)", color: "var(--on-0)" }}
        >
          <div>
            <p className={MICRO}>Total debited</p>
            <p className="font-display mt-2 text-[clamp(3rem,11vw,5.6rem)] leading-[0.82] tracking-[-0.02em] tabular-nums">
              {formatPaise(s.totalPaise)}
            </p>
          </div>

          <dl
            className="grid grid-cols-2 gap-x-4 gap-y-3 border-t-2 pt-4"
            style={{ borderColor: "var(--on-0)" }}
          >
            <div>
              <dt className={MICRO}>On last month</dt>
              <dd className="font-display text-[22px] tabular-nums">
                {hasPrevious
                  ? `${s.deltaPaise >= 0 ? "+" : "−"}${Math.abs(s.deltaPct).toFixed(1)}%`
                  : DASH}
              </dd>
              <dd className="text-[12px]">
                {hasPrevious
                  ? formatPaise(Math.abs(s.deltaPaise))
                  : "No prior month on file"}
              </dd>
            </div>
            <div>
              <dt className={MICRO}>Debits</dt>
              <dd className="font-display text-[22px] tabular-nums">{s.debits}</dd>
              <dd className="text-[12px]">
                {s.activeDays} of {DAYS_IN_MONTH} days active
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {/* ----------------------------------------------------------- rail -- */}
      <section className="border-rule bg-card grid grid-cols-2 border-2 lg:grid-cols-4">
        {rail.map((cell) => (
          <div
            key={cell.label}
            className="flex flex-col gap-1 p-4 sm:p-5"
            style={{ outline: "2px solid var(--rule)", outlineOffset: "-1px" }}
          >
            <span className={`${MICRO} text-muted`}>{cell.label}</span>
            <span className="font-display text-[clamp(1.6rem,4.4vw,2.4rem)] leading-none tracking-[-0.01em] tabular-nums">
              {cell.value}
            </span>
            <span className="text-ink-2 text-[12px] leading-snug">{cell.note}</span>
          </div>
        ))}
      </section>

      {/* -------------------------------------------------------- verdict -- */}
      {/* The full-bleed statement block: it carries the month's headline finding
          once there is one to carry. */}
      <section className="bg-bar text-on-bar border-rule border-2 p-5 sm:p-8 lg:p-10">
        <h2 className="font-display text-[clamp(1.8rem,5.4vw,3.4rem)] leading-[0.86] tracking-[-0.02em] uppercase">
          {hasData ? "The month, in one line" : "Nothing recorded yet"}
        </h2>
        <p className="mt-6 max-w-[62ch] text-[14px] leading-relaxed opacity-90">
          {hasData
            ? "The headline finding for the month goes here."
            : "No account is connected. Once transactions land, this block carries the month's headline finding — what moved, and against what."}
        </p>
      </section>

      {/* -------------------------------------------------------- treemap -- */}
      <section className="flex flex-col gap-5">
        <SectionHead
          index="01"
          title="Every rupee, to scale"
          note="Area is amount. The ten categories nest inside the seven frozen groups: one colour is one group, and the wide gutters mark where a group ends. Packed by size, never sorted by colour."
        />
        <Treemap ratio={1.85} className="hidden md:block" />
        <Treemap ratio={0.78} className="md:hidden" />
      </section>

      {/* ------------------------------------------------ pie + vs. prior -- */}
      <section className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-7">
          <SectionHead
            index="02"
            title="Seven slots, fixed order"
            note="Rent sits at twelve o'clock every month, so the shape is comparable month to month. Slots never re-sort by size."
          />
          <GroupPie bodyFont={bodyFont} displayFont={displayFont} />
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:col-span-5">
          <SectionHead
            index="03"
            title="Against last month"
            note={
              hasPrevious
                ? "Signed rupees across the same seven groups on one shared zero line. Bars scale to the largest move in either direction."
                : "Signed rupees across the same seven groups on one shared zero line, once there is a prior month to compare against."
            }
          />
          <VersusPrevious />
        </div>
      </section>

      {/* ----------------------------------------------- line + calendar -- */}
      <section className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-7">
          <SectionHead
            index="04"
            title="Spend over time"
            note="Zero-based. Switch the grain between individual days and the calendar weeks the month falls into."
          />
          <SpendLine bodyFont={bodyFont} displayFont={displayFont} />
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:col-span-5">
          <SectionHead
            index="05"
            title="The month as a grid"
            note={
              hasData
                ? "One block per day on a single-hue ramp, Monday start. Days with nothing on them are struck out rather than shaded, so absence reads as absence."
                : "One block per day, Monday start. Once transactions land, each day shades on a single-hue ramp and genuinely empty days are struck out."
            }
          />
          <CalendarBlock />
        </div>
      </section>

      {/* --------------------------------------------- merchants + ledger -- */}
      <section className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-5">
          <SectionHead
            index="06"
            title="Who took it"
            note="The largest merchants of the month. Rent and investment transfers are excluded — they are not merchants, and on the same axis they would flatten everything else."
          />
          <MerchantBars bodyFont={bodyFont} displayFont={displayFont} />
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:col-span-7">
          <SectionHead
            index="07"
            title="The ledger"
            note="Every debit, in date order. A heavy rule opens each new day."
          />
          <Ledger />
        </div>
      </section>
    </main>
  );
}
