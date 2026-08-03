"use client";

import { setTheme, useTheme } from "@/lib/theme";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

/**
 * A two-cell segmented control, not an icon that toggles. On a page whose whole
 * argument is that things should be plainly labelled, a sun/moon glyph that
 * means "the theme you are not currently in" is exactly the ambiguity to avoid.
 *
 * Both cells are real buttons carrying `aria-pressed`, so the state is
 * announced rather than implied by colour alone.
 *
 * It only ever sits inside the masthead band, so it is styled against the
 * `bar`/`on-bar` pair rather than the page ink.
 */
export function ThemeToggle() {
  const theme = useTheme();

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="flex shrink-0 border-2 border-on-bar"
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(option.value)}
            // The active cell inverts — the label is punched out of a solid
            // block, the same figure/ground move the masthead itself makes.
            className={
              active
                ? "bg-on-bar text-bar px-2.5 py-1 text-micro font-semibold tracking-[0.16em] uppercase"
                : "text-on-bar px-2.5 py-1 text-micro font-semibold tracking-[0.16em] uppercase"
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
