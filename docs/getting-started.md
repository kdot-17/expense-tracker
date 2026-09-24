# Getting started

## Requirements

- Node.js 20 or newer (the Vercel project runs Node 24)
- Access to the Vercel project, if you need the database connection string

## Setup

```bash
npm install
cp .env.example .env.local     # then fill in the three credential values
```

`.env.local` also needs the database variables. Pull them to a scratch file and
copy the database lines across — do **not** pull straight into `.env.local`,
because that overwrites the credential values you just set. See
[environment.md](environment.md) for why.

```bash
vercel env pull --environment=development .env.scratch
# copy the database lines into .env.local, then:
rm .env.scratch
```

Name the scratch file `.env.something`. `.gitignore` matches `.env*` on the
leading `.env`, so a file named `scratch.env` would **not** be ignored and would
be committed with live credentials.

Then start the dev server:

```bash
npm run dev
```

The app runs at http://localhost:3000 and redirects to `/login` until you sign in
with the `AUTH_EMAIL` and `AUTH_PASSWORD` you configured. Once signed in, **Add
expense** in the masthead records a row — and remember the database is the live
Neon instance, so anything you add during development is real data.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve a production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run palette` | Validates both colour palettes, and that `globals.css` and `palette.ts` still agree |
| `npm run verify` | All four gates: typecheck, lint, palette, build |
| `npm run db:generate` | Write a migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Browse the database |

## Before you call something done

All four gates must pass:

```bash
npm run verify     # typecheck + lint + palette + build
```

`next build` runs TypeScript too, but `tsc --noEmit` also covers files the build
never imports, so both are worth running.

If you pipe these into another command, check the real exit status — piping into
something like `tail` masks a failure and makes it look like a pass.

## Branching

Pull requests target `trunk`. There is no `main` branch. Feature branches follow
`feat/<name>`.
