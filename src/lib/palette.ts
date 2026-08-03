import {
  CATEGORY_TO_GROUP,
  GROUP_ORDER,
  TRANSACTIONS,
  type Category,
  type Group,
} from "@/lib/transactions";

/**
 * The single source of truth for colour.
 *
 * Two parallel sets, light and dark. Every value is a literal hex — never a CSS
 * variable, never `oklch()`, never `color-mix()` — because Chart.js v4 cannot
 * parse any of those and fails silently or paints black when handed one. The
 * CSS custom properties in `globals.css` carry the *same* values for the markup
 * layer; these objects exist so the canvas layer can read them in JS.
 *
 * Both sets are checked by `npm run palette`, which enforces six rules
 * (lightness band, chroma floor, CVD adjacency, no universal collision,
 * normal-vision floor, surface contrast). Changing any hex without re-running
 * it will silently break the colour-blindness guarantee. See
 * `docs/design-system.md`.
 */

export type ThemeName = "light" | "dark";

export type Palette = {
  /** Frozen categorical slots 0–5, then slot 6 "Other" at zero chroma. */
  group: readonly string[];
  /** Text that clears 4.5:1 on the matching `group` block. Measured. */
  groupOn: readonly string[];
  page: string;
  card: string;
  ink: string;
  ink2: string;
  muted: string;
  grid: string;
  /** The heavy brutalist rule. It is the ink colour, not a grey. */
  rule: string;
  /** One hue, five steps, for the calendar. Never a rainbow. */
  ramp: readonly string[];
  rampOn: readonly string[];
};

export const LIGHT: Palette = {
  group: [
    "#E93A51", // 0 Rent & home
    "#A05001", // 1 Food & dining
    "#AD8604", // 2 Groceries
    "#106B07", // 3 Transport
    "#2145CA", // 4 Bills & recharge
    "#9760F2", // 5 Investments & SIP
    "#6E6E6E", // 6 Other — deliberately zero chroma
  ],
  groupOn: ["#111111", "#FFFFFF", "#111111", "#FFFFFF", "#FFFFFF", "#111111", "#FFFFFF"],
  page: "#F5F3ED",
  card: "#FFFFFF",
  ink: "#111111",
  ink2: "#3D3D3D",
  muted: "#6E6E6E",
  grid: "#DDD9CF",
  rule: "#111111",
  ramp: ["#D0E6FF", "#A3C9FF", "#70A6F5", "#4C80CD", "#2759A2"],
  rampOn: ["#111111", "#111111", "#111111", "#111111", "#FFFFFF"],
};

export const DARK: Palette = {
  group: [
    "#E54154", // 0 Rent & home
    "#ED9E2F", // 1 Food & dining
    "#A48118", // 2 Groceries
    "#169F65", // 3 Transport
    "#2981FB", // 4 Bills & recharge
    "#CBA1FA", // 5 Investments & SIP
    "#9A9A9A", // 6 Other
  ],
  groupOn: ["#111111", "#111111", "#111111", "#111111", "#111111", "#111111", "#111111"],
  page: "#000000",
  card: "#0F0F0F",
  ink: "#FFFFFF",
  ink2: "#C9C9C9",
  muted: "#8A8A8A",
  grid: "#262626",
  rule: "#FFFFFF",
  ramp: ["#1A2E4C", "#284D83", "#366DBE", "#5992E7", "#84BFFF"],
  rampOn: ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#111111", "#111111"],
};


export const PALETTES: Record<ThemeName, Palette> = { light: LIGHT, dark: DARK };

/** Printed in the calendar key, so the ramp never has to be decoded by eye. */
export const RAMP_LABELS = ["< ₹1k", "₹1–2k", "₹2–3k", "₹3–5k", "₹5k +"] as const;

/**
 * Fixed cuts, not quantiles — a reader can hold five round numbers.
 *
 * These are **paise**, like every amount in the app, so each is a hundred times
 * the rupee figure printed in `RAMP_LABELS` above. The two lists describe the
 * same five bands and have to be edited together: a key that disagrees with the
 * shading is worse than no key at all.
 */
const RAMP_CUTS_PAISE = [
  1_00_000, // ₹1k
  2_00_000, // ₹2k
  3_00_000, // ₹3k
  5_00_000, // ₹5k
] as const;

export function rampStep(paise: number): number {
  const step = RAMP_CUTS_PAISE.findIndex((cut) => paise < cut);
  return step === -1 ? RAMP_CUTS_PAISE.length : step;
}

export function slotOf(group: Group): number {
  return GROUP_ORDER.indexOf(group);
}

export function categorySlot(category: Category): number {
  return slotOf(CATEGORY_TO_GROUP[category]);
}

/** A merchant belongs to whatever group its transactions do. */
export function merchantGroup(merchant: string): Group {
  const hit = TRANSACTIONS.find((t) => t.merchant === merchant);
  return hit ? CATEGORY_TO_GROUP[hit.category] : "Other";
}
