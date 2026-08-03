import { Anton, Inter } from "next/font/google";

/**
 * Two faces, one job each.
 *
 * Display: Anton. One weight, no italic, no compromise — a condensed grotesque
 * heavy enough to hold at 8rem and still read as a block of ink, and (unlike
 * Archivo Black, which was the first pick) it actually carries U+20B9, so the
 * rupee sign never falls back to a thin system glyph mid-number.
 *
 * Body: Inter, variable, kept deliberately quiet so the display face does all
 * the shouting.
 */
export const display = Anton({
  variable: "--font-brut-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const body = Inter({
  variable: "--font-brut-body",
  subsets: ["latin"],
  display: "swap",
});
