import {
  byCategory,
  byGroup,
  CATEGORY_TO_GROUP,
  totalSpendPaise,
  type Category,
} from "@/lib/transactions";
import { EmptyPlot } from "./empty";
import { formatPaise, formatPaiseCompact } from "@/lib/money";
import { slotOf } from "@/lib/palette";
import { squarify, type Rect } from "./squarify";

/** Poster names. The ledger at the foot of the page carries the full ones. */
const SHORT: Record<Category, string> = {
  Rent: "RENT",
  Investments: "SIP",
  Groceries: "GROCERIES",
  "Food delivery": "DELIVERY",
  "Eating out": "EATING OUT",
  Transport: "TRANSPORT",
  Bills: "BILLS",
  Shopping: "SHOPPING",
  Health: "HEALTH",
  Entertainment: "TICKETS",
};

type Tier = "xl" | "lg" | "md" | "sm";

function tierOf(share: number): Tier {
  if (share >= 20) return "xl";
  if (share >= 12) return "lg";
  if (share >= 6) return "md";
  return "sm";
}

/**
 * Cell type, sized in `cqi` against the treemap's own frame.
 *
 * This is the one place where container sizing buys something a breakpoint
 * cannot. Every cell is a *percentage* of the frame, so if the type is also a
 * percentage of the frame, then the ratio of a label's width to its cell's
 * width does not change with size at all. Get a label to fit once and it fits
 * at every width — which is not true of `md:`/`lg:` steps, where the frame
 * grows continuously between breakpoints while the type jumps at them.
 *
 * The rem bounds are the old mobile and desktop steps, so the ends are
 * unchanged and only the middle stops stepping.
 */
const LABEL_SIZE: Record<Tier, string> = {
  xl: "text-[clamp(1.75rem,4.5cqi,3.6rem)]",
  lg: "text-[clamp(1.15rem,2.63cqi,2.1rem)]",
  md: "text-[clamp(0.85rem,1.76cqi,1.4rem)]",
  sm: "text-[clamp(0.65rem,1.19cqi,0.95rem)]",
};

const AMOUNT_SIZE: Record<Tier, string> = {
  xl: "text-[clamp(2.2rem,6cqi,4.8rem)]",
  lg: "text-[clamp(1.5rem,3.64cqi,2.9rem)]",
  md: "text-[clamp(1.05rem,2.26cqi,1.8rem)]",
  sm: "text-[clamp(0.8rem,1.57cqi,1.25rem)]",
};

const PAD: Record<Tier, string> = {
  xl: "p-[clamp(0.75rem,2.19cqi,1.75rem)]",
  lg: "p-[clamp(0.625rem,1.57cqi,1.25rem)]",
  md: "p-[clamp(0.5rem,0.94cqi,0.75rem)]",
  sm: "p-[clamp(0.25rem,0.63cqi,0.5rem)]",
};

function pct(value: number, whole: number): string {
  return `${(value / whole) * 100}%`;
}

function Cell({
  category,
  amountPaise,
  share,
  rect,
  frame,
  compact,
}: {
  category: Category;
  amountPaise: number;
  share: number;
  rect: Rect;
  frame: Rect;
  compact: boolean;
}) {
  const slot = slotOf(CATEGORY_TO_GROUP[category]);
  const ink = `var(--on-${slot})`;
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
        color: ink,
        // Adjacent cells each draw 1px inside and 1px out, so every internal
        // split lands as exactly one 2px rule.
        outline: "2px solid var(--rule)",
        outlineOffset: "-1px",
      }}
      title={`${category} — ${formatPaise(amountPaise)}, ${share.toFixed(1)}% of the month`}
    >
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] md:text-[0.65rem]">
        {share.toFixed(1)}%
      </span>

      <span className="flex flex-col gap-0.5">
        <span
          className={`leading-[0.85] tracking-[-0.03em] ${LABEL_SIZE[tier]}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {SHORT[category]}
        </span>
        <span
          className={`leading-[0.85] tracking-[-0.04em] tabular-nums ${AMOUNT_SIZE[tier]}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {amount}
        </span>
      </span>
    </div>
  );
}

/**
 * Two levels: the seven frozen groups get squarified into the frame, then each
 * group's own categories are squarified inside it. One colour per group, so a
 * region of a single hue is a single group; the 6px black gutters mark where
 * one group stops and the next begins.
 */
export function Treemap({
  ratio,
  className,
  // The narrow portrait treemap is the phone layout: its cells are a couple of
  // hundred pixels across at most, and poster-scale type fills them. Exact
  // figures do not fit there at any tier, so that instance abbreviates
  // throughout rather than clipping the last digits off a number.
  compact = false,
}: {
  ratio: number;
  className?: string;
  compact?: boolean;
}) {
  const total = totalSpendPaise();
  const groups = byGroup();
  const categories = byCategory();
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

  const placedGroups = squarify(
    groups.map((entry) => ({ item: entry.group, value: entry.amountPaise })),
    frame,
  );

  return (
    <div
      className={`border-rule bg-rule @container relative w-full border-2 ${className ?? ""}`}
      style={{ aspectRatio: String(ratio) }}
    >
      {placedGroups.map(({ item: group, rect }) => {
        const members = categories.filter(
          (entry) => CATEGORY_TO_GROUP[entry.category] === group,
        );
        const inner = squarify(
          members.map((entry) => ({ item: entry, value: entry.amountPaise })),
          { x: 0, y: 0, w: rect.w, h: rect.h },
        );

        return (
          <div
            key={group}
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
                key={item.category}
                category={item.category}
                amountPaise={item.amountPaise}
                share={(item.amountPaise / total) * 100}
                compact={compact}
                rect={cell}
                frame={{ x: 0, y: 0, w: rect.w, h: rect.h }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
