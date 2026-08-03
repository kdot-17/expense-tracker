# Project structure

```
src/
  app/                 Routes and UI (App Router)
    layout.tsx         Root layout: html shell, fonts, metadata
    page.tsx           /        — the signed-in home page
    navbar.tsx         App chrome, used by pages rather than the root layout
    logout-button.tsx  Sign-out form
    login/
      page.tsx         /login
      login-form.tsx   The sign-in form (client component)
      actions.ts       login and logout server actions
    globals.css        Tailwind import and theme tokens
  components/
    dashboard/         The dashboard, one file per section
    theme-toggle.tsx   The light/dark control
  db/
    schema.ts          Table definitions
    index.ts           getDb() — the lazy database client
  lib/
    auth.ts            Credential checks and session token signing
    session.ts         Session cookie read/write
    dal.ts             Data Access Layer — the authorisation boundary
    money.ts           Paise → rupee formatting, and rupee input parsing
    transactions.ts    Data layer and selectors — all amounts in paise
    palette.ts         Chart colours as literal hex, mirroring globals.css
    theme.ts           Theme store and bootstrap script
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
  Files like `actions.ts`, `navbar.tsx`, and `login-form.tsx` sit inside route
  folders as co-located code, not endpoints. (Metadata files are the exception:
  `favicon.ico` is served at `/favicon.ico` by filename convention alone.)
- **`src/db/`** and **`src/lib/`** are outside the router entirely, so nothing in
  them can be reached by URL. The tables in `schema.ts` create no routes.
- **`drizzle/`** holds generated SQL and is committed, so the schema is
  reviewable as SQL and rebuildable from scratch.

## Imports

`@/` maps to `src/`, configured in `tsconfig.json`:

```ts
import { verifySession } from "@/lib/dal";
import { getDb } from "@/db";
```

## Server and client boundaries

Almost everything is a Server Component. Only files that need browser state carry
`"use client"` — currently just `login-form.tsx`, which uses `useActionState`.

`src/db/index.ts`, `src/lib/dal.ts`, and `src/lib/session.ts` are marked
`server-only`, so importing them from a client component fails the build instead
of leaking a connection string or a session secret into the browser bundle.

Keep client components as leaves. When charts arrive, the server should compute
the totals and pass plain numbers down as props, rather than letting a client
component fetch and aggregate.

## Configuration files

| File | Purpose |
| --- | --- |
| `next.config.ts` | Enables the React Compiler |
| `tsconfig.json` | Strict TypeScript, the `@/*` path alias |
| `eslint.config.mjs` | Flat config extending Next's core-web-vitals and TypeScript rules |
| `postcss.config.mjs` | Wires in Tailwind 4 |
| `drizzle.config.ts` | Points drizzle-kit at the schema and the database |
