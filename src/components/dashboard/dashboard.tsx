import { CalendarBlock } from "@/components/dashboard/calendar";
import { SpendLine, SubtypeBars, VerticalPie } from "@/components/dashboard/charts";
import { Ledger } from "@/components/dashboard/ledger";
import { Treemap } from "@/components/dashboard/treemap";
import { VersusPrevious } from "@/components/dashboard/versus-previous";
import {
  DAYS_IN_MONTH,
  MONTH_LABEL,
  PREVIOUS_MONTH_TOTAL_PAISE,
  stats,
} from "@/lib/expenses";
import { body, display } from "@/lib/fonts";
import { formatPaise } from "@/lib/money";
import { VERTICAL_ORDER } from "@/lib/taxonomy";

const MICRO = "text-[10px] font-semibold uppercase tracking-[0.2em]";
const DASH = "—";

function SectionHead({ index, title }: { index: string; title: string }) {
  return (
    <div className="border-rule flex items-baseline gap-3 border-b-2 pb-3">
      <span className={`${MICRO} text-muted shrink-0 tabular-nums`}>{index}</span>
      <h2 className="font-display text-[clamp(1.35rem,3.4vw,2.35rem)] leading-[0.9] tracking-[-0.01em] uppercase">
        {title}
      </h2>
    </div>
  );
}

export function Dashboard() {
  const s = stats();
  const hasData = s.count > 0;
  const hasPrevious = PREVIOUS_MONTH_TOTAL_PAISE > 0;

  // Derived, never typed as a literal — a hardcoded "ten verticals" in prose
  // goes stale the first time one is archived.
  const verticalCount = VERTICAL_ORDER.length;

  // Chart.js paints to a canvas, so it needs the resolved family name — a CSS
  // variable means nothing to it. next/font gives us that at build time.
  const displayFont = display.style.fontFamily;
  const bodyFont = body.style.fontFamily;

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
            Every expense for the month, filed under {verticalCount} verticals and
            shown to scale.
          </p>
        </div>

        <div
          className="flex flex-col justify-between gap-6 p-5 sm:p-8 lg:col-span-5"
          style={{ background: "var(--slot-0)", color: "var(--on-0)" }}
        >
          <div>
            <p className={MICRO}>Total spent</p>
            {/* Not `₹0`. Nothing recorded means we do not know what was spent,
                which is a different claim from knowing it was nothing — and
                this is the largest number on the page to be wrong about. The
                count below it stays a real 0: that one is a fact about how many
                expenses exist, not about how much money moved. */}
            {hasData ? (
              <p className="font-display mt-2 text-[clamp(3rem,11vw,5.6rem)] leading-[0.82] tracking-[-0.02em] tabular-nums">
                {formatPaise(s.totalPaise)}
              </p>
            ) : (
              // The em dash is not set at headline size. Anton renders it as a
              // long flat bar, and at 5.6rem that reads as a broken glyph
              // rather than as "no value yet".
              <p className="font-display mt-3 text-[2rem] leading-none">
                {DASH}
                <span className="sr-only">No total yet</span>
              </p>
            )}
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
              <dt className={MICRO}>Expenses</dt>
              <dd className="font-display text-[22px] tabular-nums">{s.count}</dd>
              <dd className="text-[12px]">
                {s.activeDays} of {DAYS_IN_MONTH} days active
              </dd>
            </div>
          </dl>
        </div>
      </header>

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
            : "No expenses have been recorded. Once they land, this block carries the month's headline finding — what moved, and against what."}
        </p>
      </section>

      {/* -------------------------------------------------------- treemap -- */}
      <section className="flex flex-col gap-5">
        <SectionHead index="01" title="Every rupee, to scale" />
        <Treemap ratio={1.85} className="hidden md:block" />
        <Treemap ratio={0.78} className="md:hidden" compact />
      </section>

      {/* ------------------------------------------------ pie + vs. prior -- */}
      <section className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-7">
          <SectionHead index="02" title="The verticals, fixed order" />
          <VerticalPie bodyFont={bodyFont} displayFont={displayFont} />
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:col-span-5">
          <SectionHead index="03" title="Against last month" />
          <VersusPrevious />
        </div>
      </section>

      {/* ----------------------------------------------- line + calendar -- */}
      <section className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-7">
          <SectionHead index="04" title="Spend over time" />
          <SpendLine bodyFont={bodyFont} displayFont={displayFont} />
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:col-span-5">
          <SectionHead index="05" title="The month as a grid" />
          <CalendarBlock />
        </div>
      </section>

      {/* --------------------------------------------- subtypes + ledger -- */}
      <section className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-5">
          <SectionHead index="06" title="Where it actually went" />
          <SubtypeBars bodyFont={bodyFont} displayFont={displayFont} />
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:col-span-7">
          <SectionHead index="07" title="The ledger" />
          <Ledger />
        </div>
      </section>
    </main>
  );
}
