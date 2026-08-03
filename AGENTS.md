<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project documentation

[`docs/README.md`](docs/README.md) indexes every document and is the entry point. Read the one covering the area you are about to touch, before writing code:

| Area | Document |
| --- | --- |
| Schema, the vertical → subtype → expense hierarchy, migrations, seed data | [`docs/database.md`](docs/database.md) |
| Reads, writes, SQL aggregation, dates, charts, user-facing errors | [`docs/conventions.md`](docs/conventions.md) |
| Rupee parsing, paise storage, formatting | [`docs/money.md`](docs/money.md) |
| Sessions and where authorisation is actually enforced | [`docs/auth.md`](docs/auth.md) |
| Colour, type, layout, charts, dark mode | [`docs/design-system.md`](docs/design-system.md) |
| Local setup and scripts | [`docs/getting-started.md`](docs/getting-started.md) |

Docs are updated in the same change as the code they describe, never afterwards. Every server action, route handler, schema change, and shared helper belongs in one of them.

# Read the design system first

**Before changing anything that renders — styling, colour, spacing, type, layout,
or a chart — read [`docs/design-system.md`](docs/design-system.md).** It is the
authority on all of that and supersedes any older styling notes.

It is not a style suggestion. It records decisions enforced by `npm run palette`
that have already caused real bugs when ignored. If a change would contradict
it, update that document first and say why.

The four that bite hardest:

- **Never hand Chart.js a CSS variable, `oklch()` or `color-mix()`.** Chart.js v4
  cannot parse them; it fails silently or paints black. Canvas colours come from
  `@/lib/palette`, as literal hex.
- **Chart.js captures inline plugins at construction and never swaps them.** A
  plugin closing over React state freezes at first render. Read live state off
  the `chart` argument, or key the chart on what changed.
- **Colour is identity, never magnitude and never sentiment.** Slot order is
  frozen: slot N is `VERTICAL_ORDER[N]`, in both themes and every month. Every
  coloured series is also directly labelled.
- **The palette has no headroom left.** Ten slots pass all eight checks, but the
  worst adjacent pair clears deuteranopia by 0.1 ΔE. Adding a vertical means
  re-solving the whole set against `npm run palette`, not appending a hex.

## Styling

Tailwind v4, CSS-first — there is no `tailwind.config`. Tokens live in
`@theme` / `:root` in `src/app/globals.css` and are exposed as utilities
(`bg-page`, `text-ink`, `border-rule`, `bg-slot-3`).

Use the token utilities. A raw hex in a `className` (`text-[#111111]`) is a bug:
it will not follow the theme. The only places literal hex belongs are
`globals.css`, `src/lib/palette.ts`, and canvas drawing code.

Dark mode is an explicit choice — `data-theme` on `<html>`, falling back to
`prefers-color-scheme`. Do not use Tailwind's `dark:` variant; it does not know
about the toggle. Both themes are first-class, and anything you add must be
checked in both.

## Showing data you do not have

The page must never assert a fact it has not got. With nothing recorded, a stat
shows an em dash rather than `₹0`, a comparison against a month that does not
exist is withheld rather than reported as "no change", and a legend for an
encoding that is not on screen is not drawn. Several real bugs here have all
been the same mistake: rendering the zero value instead of the unknown one.

Prefer to make that impossible in the seam rather than remembering it in the
component. `verticalVsPrevious()` returns `null`, not ten zeroes, so a caller
that forgets cannot render "no change" ten times over a comparison nobody made.
The same applies to a truncated figure: a treemap cell too small for its amount
shows no amount, because a clipped `₹920` reads as `₹92`.

Any figure appearing in prose must be derived from the data, never typed as a
literal — a confidently wrong number in a footnote is a bug, not a nit.

# Before a change is done

```bash
npm run verify     # typecheck + lint + palette + build — all four, every time
```

Work is not done until all four pass. `npm run palette` also cross-checks that
`globals.css` and `src/lib/palette.ts` still declare identical values, so the
two cannot drift apart.

Pull requests target `trunk` — there is no `main` branch.
