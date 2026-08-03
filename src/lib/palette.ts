/**
 * The single source of truth for colour.
 *
 * Two parallel sets, light and dark. Every value is a literal hex — never a CSS
 * variable, never `oklch()`, never `color-mix()` — because Chart.js v4 cannot
 * parse any of those and fails silently or paints black when handed one. The
 * CSS custom properties in `globals.css` carry the *same* values for the markup
 * layer; these objects exist so the canvas layer can read them in JS.
 *
 * Both sets are checked by `npm run palette`, which enforces eight rules
 * (lightness band, chroma floor, CVD adjacency, no universal collision,
 * normal-vision floor, surface contrast, focus ring, label contrast). Changing
 * any hex without re-running it will silently break the colour-blindness
 * guarantee. See `docs/design-system.md`.
 *
 * There are ten slots because there are ten verticals. Slot order is frozen and
 * matches `VERTICAL_ORDER` in `@/lib/taxonomy` exactly — index N here is
 * `VERTICAL_ORDER[N]`, in both themes and every month.
 */

export type ThemeName = "light" | "dark";

export type Palette = {
  /** Frozen categorical slots 0–8, then slot 9 "Other" at zero chroma. */
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
    "#CF3651", // 0 Food
    "#909000", // 1 Convenience
    "#1B24D8", // 2 Subscriptions
    "#006336", // 3 Transport
    "#009990", // 4 Health
    "#AB63C6", // 5 Shopping
    "#87096C", // 6 Leisure
    "#906300", // 7 People
    "#1275A2", // 8 Loans
    "#6E6E6E", // 9 Other — deliberately zero chroma
  ],
  groupOn: [
    "#FFFFFF",
    "#111111",
    "#FFFFFF",
    "#FFFFFF",
    "#111111",
    "#111111",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
    "#FFFFFF",
  ],
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
    "#FC3F75", // 0 Food
    "#87871B", // 1 Convenience
    "#6C75E1", // 2 Subscriptions
    "#51E16C", // 3 Transport
    "#2D907E", // 4 Health
    "#D8ABEA", // 5 Shopping
    "#CF51C6", // 6 Leisure
    "#F3AB1B", // 7 People
    "#36BDFC", // 8 Loans
    "#9A9A9A", // 9 Other
  ],
  groupOn: [
    "#111111",
    "#111111",
    "#111111",
    "#111111",
    "#111111",
    "#111111",
    "#111111",
    "#111111",
    "#111111",
    "#111111",
  ],
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
 * Fixed cuts, not quantiles — a reader can hold five round numbers. Takes
 * paise, like everything else that touches an amount; the labels above are the
 * rupee equivalents of these boundaries.
 */
export function rampStep(paise: number): number {
  if (paise < 100_000) return 0; // < ₹1,000
  if (paise < 200_000) return 1;
  if (paise < 300_000) return 2;
  if (paise < 500_000) return 3;
  return 4;
}
