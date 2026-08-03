# Project structure

```
src/
  app/                 Routes only (App Router)
    layout.tsx         Root layout: html shell, fonts, theme bootstrap
    page.tsx           /        — the dashboard, auth-gated
    login/
      page.tsx         /login
      login-form.tsx   The sign-in form (client component)
      actions.ts       login and logout server actions
    globals.css        Tailwind import and theme tokens
  components/
    theme-toggle.tsx   The light/dark control (client)
    dashboard/         One file per module of the board
      dashboard.tsx    Which module sits in which tab and cell
      tab-shell.tsx    The Overview/Breakdown/Ledger switcher (client)
      tile.tsx         The bordered box a module lives in
      kpi-strip.tsx    The four figures above the tabs
      masthead.tsx     The top band
      charts.tsx       The three Chart.js canvases (client)
      treemap.tsx      Verticals containing their subtypes, to scale
      squarify.ts      Squarified treemap layout, no dependencies
      calendar.tsx     The month as a grid, on the ramp
      versus-previous.tsx  The diverging month-on-month strip
      ledger.tsx       Every expense, in date order
      empty.tsx        The shared zero state
      frames.ts        Plot frame shapes, shared by charts.tsx and empty.tsx
  db/
    schema.ts          Table definitions
    index.ts           getDb() — the lazy database client
  lib/
    auth.ts            Credential checks and session token signing
    session.ts         Session cookie read/write
    dal.ts             Data Access Layer — the authorisation boundary
    money.ts           Paise → rupee formatting, and rupee input parsing
    taxonomy.ts        The ten verticals and their subtypes
    expenses.ts        The data seam every component reads — amounts in paise
    palette.ts         Chart colours as literal hex, mirroring globals.css
    theme.ts           Theme store and pre-paint bootstrap script
    fonts.ts           The two typefaces
    chart-setup.ts     Chart.js registration
  proxy.ts             Runs before pages; optimistic auth gate
drizzle/               Generated migration SQL, committed
scripts/               palette-check.mjs — the palette validator
docs/                  This documentation
```

## What lives where

- **`src/app/`** is the only directory the router looks at. A path becomes a real
  URL only when a `page.tsx` or `route.ts` exists — a folder alone does nothing.
  Files like `actions.ts` and `login-form.tsx` sit inside route folders as
  co-located code, not endpoints. (Metadata files are the exception:
  `favicon.ico`, `icon.svg` and `apple-icon.png` are each served at their own
  path by filename convention alone, with no `page.tsx` or `route.ts` involved.
  Because they *are* routes, the proxy matcher has to exempt each one — see
  [auth.md](auth.md).)
- **`src/components/`** holds everything that renders but is not a route. The
  dashboard is split one file per module rather than one long page, because the
  modules are independently readable and independently broken. `dashboard.tsx`
  itself only decides which module sits in which tab and which grid cell.
- **`src/db/`** and **`src/lib/`** are outside the router entirely, so nothing in
  them can be reached by URL. The tables in `schema.ts` create no routes.
- **`drizzle/`** holds generated SQL and is committed, so the schema is
  reviewable as SQL and rebuildable from scratch.

## The two halves that have not met yet

`src/db/` reads real expenses out of Postgres. `src/lib/expenses.ts` is what the
page actually renders, and it is **empty** — no query runs. The shapes match on
purpose (integer paise, a vertical and a subtype on every row), so connecting
them is a matter of filling that one module. Until then the board is a complete
scaffold showing honest empty states, and no component knows the difference.

## Imports

`@/` maps to `src/`, configured in `tsconfig.json`:

```ts
import { verifySession } from "@/lib/dal";
import { getDb } from "@/db";
```

## Server and client boundaries

Almost everything is a Server Component. Only files that need browser state carry
`"use client"`: `login-form.tsx` (`useActionState`), `theme-toggle.tsx`,
`charts.tsx` (Chart.js needs a canvas) and `tab-shell.tsx` (which view is on
screen). `TabShell`'s panels are rendered on the server and handed to it as
props, so the tabs cost no extra client markup.

`src/db/index.ts`, `src/lib/dal.ts`, and `src/lib/session.ts` are marked
`server-only`, so importing them from a client component fails the build instead
of leaking a connection string or a session secret into the browser bundle.

Keep client components as leaves. The charts read their totals through the
`expenses.ts` seam rather than fetching or aggregating themselves, so the
client bundle carries rendering and nothing else.

## Configuration files

| File | Purpose |
| --- | --- |
| `next.config.ts` | Enables the React Compiler |
| `tsconfig.json` | Strict TypeScript, the `@/*` path alias |
| `eslint.config.mjs` | Flat config extending Next's core-web-vitals and TypeScript rules |
| `postcss.config.mjs` | Wires in Tailwind 4 |
| `drizzle.config.ts` | Points drizzle-kit at the schema and the database |
