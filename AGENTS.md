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
| Local setup and scripts | [`docs/getting-started.md`](docs/getting-started.md) |

Docs are updated in the same change as the code they describe, never afterwards. Every server action, route handler, schema change, and shared helper belongs in one of them.

# Before a change is done

```bash
npm run typecheck
npm run lint
npm run build
```

All three must pass. Pull requests target `trunk` — there is no `main` branch.
