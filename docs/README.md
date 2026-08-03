# Expense Tracker documentation

A single-user expense tracker. One person signs in with a fixed email and
password, records what they spent, and sees where their money went. All amounts
are Indian rupees.

## Contents

| Document | Covers |
| --- | --- |
| [getting-started.md](getting-started.md) | Local setup, scripts, and what must pass before shipping |
| [project-structure.md](project-structure.md) | Where everything lives and why |
| [conventions.md](conventions.md) | How data is read, written, aggregated, and displayed |
| [database.md](database.md) | The vertical/subtype/expense hierarchy, tables, constraints, indexes, the seeded taxonomy, and how to run migrations |
| [money.md](money.md) | How rupee amounts are parsed, stored, and displayed |
| [auth.md](auth.md) | Signing in, sessions, and where authorisation is enforced |
| [ui.md](ui.md) | Components, styling, fonts, and dark mode |
| [environment.md](environment.md) | Every environment variable and where it lives |
| [deployment.md](deployment.md) | Vercel setup, branches, previews, and known gaps |

## Stack

- **Next.js 16** (App Router) with React 19 and the React Compiler enabled
- **Postgres** on Neon, hosted in Singapore, accessed through Drizzle ORM
- **Tailwind CSS 4** for styling
- **Chart.js** for spending charts
- Deployed on **Vercel**

## Conventions

Documentation lives here and is updated in the same change as the code it
describes, not afterwards. Every API — server actions, route handlers, database
schema, and shared helpers — belongs in one of the files above.

Before any change is considered done, all three of these must pass:

```bash
npm run typecheck
npm run lint
npm run build
```

Pull requests target the `trunk` branch. There is no `main` branch.
