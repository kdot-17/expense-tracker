"use client";

import { useSyncExternalStore } from "react";

import { PALETTES, type Palette, type ThemeName } from "@/lib/palette";

export const THEME_STORAGE_KEY = "theme";

/**
 * Runs before first paint, so the page never flashes the wrong theme. Injected
 * as a blocking inline script in the root layout — it must stay dependency-free
 * and small enough to read at a glance, because it is the one piece of code
 * that ships as a raw string.
 *
 * It only writes the attribute when a choice is *stored*. With nothing stored,
 * the attribute stays absent and the CSS falls through to
 * `prefers-color-scheme`, which is the behaviour we want.
 */
export const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;

function resolve(): ThemeName {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // The OS preference still matters while no explicit choice is stored.
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", emit);
  return () => {
    listeners.delete(onChange);
    query.removeEventListener("change", emit);
  };
}

// A primitive, so React's snapshot comparison is a value comparison.
const getSnapshot = (): ThemeName => resolve();
const getServerSnapshot = (): ThemeName => "light";

/**
 * `useSyncExternalStore` rather than `useEffect` + state: it renders the server
 * snapshot during hydration and then immediately re-reads the real one, so the
 * markup matches on the first pass and corrects itself without a mismatch
 * warning or a visible flash.
 */
export function useTheme(): ThemeName {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * The canvas palette. Chart.js cannot read a CSS variable, so charts take their
 * colours from here — the same values `globals.css` declares for the markup.
 */
export function useChartPalette(): Palette {
  return PALETTES[useTheme()];
}

export function setTheme(theme: ThemeName): void {
  document.documentElement.setAttribute("data-theme", theme);
  // `viewport.themeColor` is keyed to prefers-color-scheme, which knows nothing
  // about an explicit choice — a reader on a light-mode OS who picks dark would
  // otherwise keep light browser chrome. Next emits one tag per media query and
  // exactly one of them is live at a time, so set them all: whichever is
  // currently matching then carries the chosen colour.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute("content", PALETTES[theme].page);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode, or storage disabled. The attribute is already set, so the
    // choice holds for this page view — it just will not be remembered.
  }
  emit();
}
