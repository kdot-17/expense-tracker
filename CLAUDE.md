@AGENTS.md

# Before any visual change

Read [`docs/design-system.md`](docs/design-system.md) **first** — before editing
styling, colour, spacing, type, layout, or a chart. It has reference screenshots
of both themes, the frozen slot palette, and the Chart.js rules that have each
already caused a bug in this repo.

Do not introduce a colour that is not a token. Do not ship a visual change
without checking it in **both** light and dark.

Finish with `npm run verify` — typecheck, lint, palette, build. All four.
