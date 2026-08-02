# Database

Postgres 17 on Neon, provisioned through the Vercel Marketplace as the resource
`neon-rose-engine`. The region is **`ap-southeast-1` (Singapore)** — the closest
region Neon offers to India, since Neon has no Indian region. The region is fixed
at creation and cannot be changed without destroying and recreating the database.

Schema is defined in `src/db/schema.ts` using Drizzle ORM.

## Connecting

`src/db/index.ts` exports a single function:

```ts
import { getDb } from "@/db";

const db = getDb();
```

`getDb()` builds the client on first call and reuses it afterwards. It is
deliberately **not** a module-level constant: Next evaluates top-level module
code during `next build`, so constructing the client at import time would fail
the build anywhere `DATABASE_URL` is absent.

It is also deliberately **not** a `Proxy` wrapper. A Proxy intercepts the
property probing that adapter libraries perform, which breaks them in ways that
surface as silent hangs rather than errors.

The module is marked `server-only`, so importing it from a Client Component is a
build error rather than a leaked connection string.

## Tables

### `verticals`

Top-level spending categories, such as *Food* or *Shopping*.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `integer` | Primary key, generated always as identity |
| `name` | `text` | Required |
| `archived_at` | `timestamptz` | Set to retire a vertical; null means active |
| `created_at` | `timestamptz` | Defaults to now |
| `updated_at` | `timestamptz` | Defaults to now, maintained on update |

Verticals are **editable but never deletable**. Retiring one means setting
`archived_at`, which hides it from pickers while leaving every expense beneath it
resolvable.

### `subtypes`

The second level of the taxonomy — a *Store* within *Shopping*, for example.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `integer` | Primary key, generated always as identity |
| `vertical_id` | `integer` | References `verticals(id)`, `ON DELETE RESTRICT` |
| `name` | `text` | Required |
| `archived_at` | `timestamptz` | Set to retire a subtype |
| `created_at` | `timestamptz` | Defaults to now |
| `updated_at` | `timestamptz` | Defaults to now, maintained on update |

Subtypes are editable, and deletable **only while unused**. Once an expense
references one, the database refuses the delete, so `archived_at` becomes the way
to retire it. Delete handles typos; archive handles retirement.

### `expenses`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `integer` | Primary key, generated always as identity |
| `vertical_id` | `integer` | Part of the composite foreign key below |
| `subtype_id` | `integer` | Part of the composite foreign key below |
| `amount_paise` | `integer` | Whole paise, must be greater than zero |
| `spent_on` | `date` | Calendar day, not an instant |
| `note` | `text` | Optional free text |
| `created_at` | `timestamptz` | Defaults to now |
| `updated_at` | `timestamptz` | Defaults to now, maintained on update |

Expenses are fully editable and deletable.

## Constraints and why they exist

| Constraint | Table | Purpose |
| --- | --- | --- |
| `expenses_subtype_vertical_fk` | expenses | Composite FK on `(subtype_id, vertical_id)` → `subtypes(id, vertical_id)` |
| `expenses_amount_paise_positive` | expenses | `CHECK (amount_paise > 0)` |
| `subtypes_id_vertical_id_key` | subtypes | `UNIQUE (id, vertical_id)`, the target of the composite FK |
| `subtypes_vertical_id_verticals_id_fk` | subtypes | `ON DELETE RESTRICT` to verticals |
| `verticals_name_lower_key` | verticals | `UNIQUE (lower(name))` |
| `subtypes_vertical_name_lower_key` | subtypes | `UNIQUE (vertical_id, lower(name))` |

**The composite foreign key** is the important one. An expense stores both its
vertical and its subtype, so totals per vertical need no join. But a subtype
already knows its own vertical, which makes the pair redundant and therefore able
to disagree — an expense could otherwise claim vertical *Food* with a subtype
belonging to *Shopping*. Referencing `subtypes(id, vertical_id)` as a pair makes
that combination impossible at the database level rather than by convention. This
is also why `subtypes` carries the otherwise-odd-looking `UNIQUE (id,
vertical_id)`: a foreign key can only reference columns that are provably unique.
A declared constraint is used rather than a bare unique index because it is
self-documenting and is what Drizzle emits — Postgres would accept either.

**Case-insensitive uniqueness** stops *Food* and *food* from both existing, which
matters because these names are user-entered. It is expressed as a unique index
on `lower(name)` rather than a unique constraint, because Postgres does not allow
expressions in `UNIQUE` constraints. On `subtypes` the uniqueness is scoped per
vertical, so *Shopping → Online* and *Food → Online* can coexist.

**Every foreign key is `RESTRICT`.** Nothing cascades. A cascade from verticals
would mean one delete silently destroying spend history.

## Indexes

| Index | Table | Columns |
| --- | --- | --- |
| `expenses_spent_on_idx` | expenses | `(spent_on)` |
| `expenses_vertical_spent_on_idx` | expenses | `(vertical_id, spent_on)` |
| `expenses_subtype_spent_on_idx` | expenses | `(subtype_id, spent_on)` |

They are ascending. Postgres scans an index in either direction, so these already
serve `ORDER BY spent_on DESC` without a descending declaration.

There is deliberately **no separate index on `subtypes.vertical_id`**. Postgres
does not index foreign key columns automatically, so adding one looks correct —
but `subtypes_vertical_name_lower_key` already leads with `vertical_id`, and
Postgres will use that index for lookups on `vertical_id` alone. A separate index
would add write cost and occupy disk for nothing.

The indexes on the taxonomy tables exist as **correctness constraints, not
performance work**. With a few dozen verticals, Postgres will sequential-scan
them faster than it could use an index.

## Migrations

Migration SQL is generated from the schema and committed under `drizzle/`, so the
database can be rebuilt from scratch and every change is reviewable as SQL.

```bash
npm run db:generate   # write a new migration from schema.ts changes
npm run db:migrate    # apply pending migrations
npm run db:studio     # browse the data
```

Each script runs through `dotenv-cli`, because `drizzle-kit` does not read
`.env.local` the way Next does. Any other standalone Node script that needs these
variables needs the same treatment.

## Querying conventions

- **Every query goes through the Data Access Layer**, which calls `verifySession()`
  first. See [auth.md](auth.md) — that is the real security boundary.
- **Aggregate in SQL, not JavaScript.** Use `SUM(amount_paise) ... GROUP BY`
  rather than fetching rows and reducing them.
- **`SUM(integer)` returns `bigint`, which the driver hands back as a string.**
  Cast it (`SUM(amount_paise)::int`) or convert explicitly. The same applies to
  any `numeric` column.
- **Compute date ranges in `Asia/Kolkata`.** Server code runs in UTC, so deriving
  "this month" from the server clock puts late-evening Indian expenses in the
  wrong month.
