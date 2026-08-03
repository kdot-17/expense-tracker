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
      dashboard.tsx    Which module sits where, and the chart-prop computing
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
    period.ts          IST calendar arithmetic — "what month is it" lives here
    taxonomy.ts        The ten verticals and their subtypes
    expenses.ts        Pure selectors over a fetched month — amounts in paise
    expenses-data.ts   getMonthData() — the one database read, server-only
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
  decides which module sits in which tab and which grid cell, and computes the
  plain values the client charts are handed.
- **`src/db/`** and **`src/lib/`** are outside the router entirely, so nothing in
  them can be reached by URL. The tables in `schema.ts` create no routes.
- **`drizzle/`** holds generated SQL and is committed, so the schema is
  reviewable as SQL and rebuildable from scratch.

## How data reaches the page

`src/app/page.tsx` computes the current period (`currentPeriod()` in
`src/lib/period.ts`, pinned to Asia/Kolkata) and fetches one `MonthData` via
`getMonthData()` in `src/lib/expenses-data.ts` — a single batched query per
render, behind `verifySession()`. That value is threaded down as props: Server
Components call the pure selectors in `src/lib/expenses.ts` themselves, and
the client charts receive computed plain arrays and numbers from `Dashboard`,
never the raw rows. Nothing below the page touches the database, and with no
rows recorded every module still shows its honest empty state.

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

`src/db/index.ts`, `src/lib/dal.ts`, `src/lib/session.ts`, and
`src/lib/expenses-data.ts` are marked `server-only`, so importing them from a
client component fails the build instead of leaking a connection string or a
session secret into the browser bundle.

Keep client components as leaves. The charts receive their totals as props
computed by `Dashboard` on the server rather than fetching or aggregating
themselves, so the client bundle carries rendering and nothing else.

## Configuration files

| File | Purpose |
| --- | --- |
| `next.config.ts` | Enables the React Compiler |
| `tsconfig.json` | Strict TypeScript, the `@/*` path alias |
| `eslint.config.mjs` | Flat config extending Next's core-web-vitals and TypeScript rules |
| `postcss.config.mjs` | Wires in Tailwind 4 |
| `drizzle.config.ts` | Points drizzle-kit at the schema and the database |
