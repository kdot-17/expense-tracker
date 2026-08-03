<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Read the design system first

**Before changing anything that renders — styling, colour, spacing, type, layout,
or a chart — read [`docs/design-system.md`](docs/design-system.md).**

It is not a style suggestion. It records decisions that are enforced by
`npm run palette` and that have already caused real bugs when ignored. If a
change would contradict it, update that document first and say why.

The three that bite hardest:

- **Never hand Chart.js a CSS variable, `oklch()` or `color-mix()`.** Chart.js v4
  cannot parse them; it fails silently or paints black. Canvas colours come from
  `@/lib/palette`, as literal hex.
- **Chart.js captures inline plugins at construction and never swaps them.** A
  plugin closing over React state freezes at first render. Read live state off
  the `chart` argument, or key the chart on what changed.
- **Colour is identity, never magnitude and never sentiment.** Slot order is
  frozen. Every coloured series is also directly labelled.

# Conventions

## Styling

Tailwind v4, CSS-first — there is no `tailwind.config`. Tokens live in
`@theme` / `:root` in `src/app/globals.css` and are exposed as utilities
(`bg-page`, `text-ink`, `border-rule`, `bg-slot-3`).

Use the token utilities. A raw hex in a `className` (`text-[#111111]`) is a bug:
it will not follow the theme. The only places literal hex belongs are
`globals.css`, `src/lib/palette.ts`, and canvas drawing code.

Both themes are first-class. Anything you add must be checked in both.

## Data

`src/lib/transactions.ts` is the data layer and the seam for wiring a real
source. `TRANSACTIONS` is currently empty, so every selector returns the zero
case and the page renders its scaffold with empty states.

Any figure that appears in prose must be derived from the data, never typed as a
literal — a confidently wrong number in a footnote is a bug, not a nit. Do not
reintroduce sample data into this module to make the page "look full"; if you
need data to develop against, add it behind a flag and keep the empty path
working.

## Verifying

```
npm run verify     # typecheck + lint + palette + build — all four, every time
```

Work is not done until all four pass. `npm run palette` also cross-checks that
`globals.css` and `src/lib/palette.ts` still declare identical values, so the
two cannot drift apart.

## Docs

Document features, schemas and APIs under `docs/`. That is part of finishing the
work, not a follow-up.

## Git

PRs target `trunk`. There is no `main` branch in this repo.
