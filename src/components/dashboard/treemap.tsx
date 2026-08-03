import { bySubtype, byVertical, totalSpendPaise } from "@/lib/expenses";
import { formatPaise, formatPaiseCompact } from "@/lib/money";
import { slotOf, subtypeKey, type SubtypeRef } from "@/lib/taxonomy";

import { EmptyPlot } from "./empty";
import { squarify, type Rect } from "./squarify";

/**
 * Two defences against a clipped figure, because `overflow-hidden` slicing
 * through digits turns `₹1,340.08` into a readable-but-wrong `₹1,340.0`.
 *
 * `sm` and the narrow layout abbreviate — `formatPaiseCompact`, exact amount
 * still in the `title`. `xs` goes further and drops the amount entirely: the
 * taxonomy has 47 subtypes rather than 10 categories, so a cell at half a per
 * cent is a few pixels tall and cannot hold even an abbreviated number. Those
 * carry the name only, and the figure lives in the tooltip, the vertical table
 * and the ledger.
 */
type Tier = "xl" | "lg" | "md" | "sm" | "xs";

function tierOf(share: number): Tier {
  if (share >= 20) return "xl";
  if (share >= 12) return "lg";
  if (share >= 6) return "md";
  if (share >= 2) return "sm";
  return "xs";
}

const LABEL_SIZE: Record<Tier, string> = {
  xl: "text-[1.75rem] md:text-[2.75rem] lg:text-[3.6rem]",
  lg: "text-[1.15rem] md:text-[1.6rem] lg:text-[2.1rem]",
  md: "text-[0.85rem] md:text-[1.05rem] lg:text-[1.4rem]",
  sm: "text-[0.65rem] md:text-[0.8rem] lg:text-[0.95rem]",
  xs: "text-[0.5rem] md:text-[0.6rem] lg:text-[0.7rem]",
};

const AMOUNT_SIZE: Record<Tier, string> = {
  xl: "text-[2.2rem] md:text-[3.4rem] lg:text-[4.8rem]",
  lg: "text-[1.5rem] md:text-[2.1rem] lg:text-[2.9rem]",
  md: "text-[1.05rem] md:text-[1.35rem] lg:text-[1.8rem]",
  sm: "text-[0.8rem] md:text-[1rem] lg:text-[1.25rem]",
  xs: "", // never drawn
};

const PAD: Record<Tier, string> = {
  xl: "p-3 md:p-5 lg:p-7",
  lg: "p-2.5 md:p-4 lg:p-5",
  md: "p-2 md:p-3",
  sm: "p-1 md:p-2",
  xs: "p-1",
};

function pct(value: number, whole: number): string {
  return `${(value / whole) * 100}%`;
}

function Cell({
  subtype,
  amountPaise,
  share,
  rect,
  frame,
  compact,
}: {
  subtype: SubtypeRef;
  amountPaise: number;
  share: number;
  rect: Rect;
  frame: Rect;
  compact: boolean;
}) {
  const slot = slotOf(subtype.vertical);
  const tier = tierOf(share);

  // A full `₹1,340.08` runs past the edge of a narrow cell and gets clipped
  // mid-number, which reads as a wrong figure rather than a truncated one — so
  // the tight cases abbreviate. The `title` below always carries the exact
  // amount, and so does the ledger; this is the same split the calendar uses.
  const amount =
    compact || tier === "sm" ? formatPaiseCompact(amountPaise) : formatPaise(amountPaise);

  return (
    <div
      className={`absolute flex flex-col justify-between overflow-hidden ${PAD[tier]}`}
      style={{
        left: pct(rect.x, frame.w),
        top: pct(rect.y, frame.h),
        width: pct(rect.w, frame.w),
        height: pct(rect.h, frame.h),
        background: `var(--slot-${slot})`,
        // Measured against this exact slot by `npm run palette` check 8, not
        // guessed — half the slots need dark ink and half need light.
        color: `var(--on-${slot})`,
        // Adjacent cells each draw 1px inside and 1px out, so every internal
        // split lands as exactly one 2px rule.
        outline: "2px solid var(--rule)",
        outlineOffset: "-1px",
      }}
      title={`${subtype.vertical} · ${subtype.name} — ${formatPaise(
        amountPaise,
      )}, ${share.toFixed(1)}% of the month`}
    >
      {tier === "xs" ? null : (
        <span className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] md:text-[0.65rem]">
          {share.toFixed(1)}%
        </span>
      )}

      <span className="flex flex-col gap-0.5">
        <span
          className={`leading-[0.85] tracking-[-0.03em] uppercase ${LABEL_SIZE[tier]}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {subtype.name}
        </span>
        {tier === "xs" ? null : (
          <span
            className={`leading-[0.85] tracking-[-0.04em] tabular-nums ${AMOUNT_SIZE[tier]}`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {amount}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * Two levels, and they are the two real levels of the taxonomy: the ten
 * verticals are squarified into the frame, then each vertical's own subtypes
 * are squarified inside it. One colour per vertical, so a region of a single
 * hue is a single vertical; the 6px rule gutters mark where one stops and the
 * next begins.
 *
 * Verticals with nothing recorded are dropped here rather than drawn at zero
 * width — `squarify` divides by the running total, and a zero-value item is a
 * degenerate rectangle. The pie keeps them; it indexes by slot.
 */
export function Treemap({
  ratio,
  className,
  compact = false,
}: {
  ratio: number;
  className?: string;
  /** The narrow layout: poster-scale type in a cell a couple of hundred pixels
      wide, where even a mid-sized cell cannot hold a full figure. */
  compact?: boolean;
}) {
  const total = totalSpendPaise();
  const verticals = byVertical().filter((entry) => entry.amountPaise > 0);
  const subtypes = bySubtype();
  const frame: Rect = { x: 0, y: 0, w: ratio, h: 1 };

  // squarify divides by the total, so an empty month is not a degenerate
  // layout — it is simply nothing to lay out.
  if (total === 0) {
    return (
      <div className={className} style={{ aspectRatio: String(ratio) }}>
        <EmptyPlot className="h-full" />
      </div>
    );
  }

  const placed = squarify(
    verticals.map((entry) => ({ item: entry.vertical, value: entry.amountPaise })),
    frame,
  );

  return (
    <div
      className={`relative w-full border-2 border-rule bg-rule ${className ?? ""}`}
      style={{ aspectRatio: String(ratio) }}
    >
      {placed.map(({ item: vertical, rect }) => {
        const members = subtypes.filter((entry) => entry.vertical === vertical);
        const inner = squarify(
          members.map((entry) => ({ item: entry, value: entry.amountPaise })),
          { x: 0, y: 0, w: rect.w, h: rect.h },
        );

        return (
          <div
            key={vertical}
            className="absolute"
            style={{
              left: `calc(${pct(rect.x, frame.w)} + 3px)`,
              top: `calc(${pct(rect.y, frame.h)} + 3px)`,
              width: `calc(${pct(rect.w, frame.w)} - 6px)`,
              height: `calc(${pct(rect.h, frame.h)} - 6px)`,
            }}
          >
            {inner.map(({ item, rect: cell }) => (
              <Cell
                key={subtypeKey(item)}
                subtype={item}
                amountPaise={item.amountPaise}
                share={(item.amountPaise / total) * 100}
                rect={cell}
                frame={{ x: 0, y: 0, w: rect.w, h: rect.h }}
                compact={compact}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
