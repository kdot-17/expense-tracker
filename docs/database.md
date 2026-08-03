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

## Hierarchy

Three levels. Verticals hold subtypes, subtypes hold expenses, and money only
ever lands at the bottom.

```
LEVEL 1              LEVEL 2                LEVEL 3
verticals            subtypes               expenses
10 rows, permanent   ~47 rows, editable     grows forever
"what kind of        "what kind of Food"    the actual money
 spending"

Food ────────────┬── Swiggy ────────────┬── ₹2,340   02 Aug   "lunch"
                 │                      └── ₹880     28 Jul
                 │
                 ├── Dining Out ────────┬── ₹1,200   01 Aug   "dinner out"
                 │                      └── ₹450     30 Jul
                 │
                 ├── Bistro ────────────── ₹380      31 Jul
                 │
                 └── Others ────────────── ₹60       03 Aug   "chai"
```

A vertical has many subtypes; a subtype belongs to exactly one vertical. A
subtype has many expenses; an expense belongs to exactly one subtype.

The part that is not a plain tree: an expense points at **both** its subtype and
its vertical.

```
  verticals          ┌─────────────────────────────────┐
                     │ id            1                 │
                     │ name          "Food"            │
                     └────────────────┬────────────────┘
                                      │ vertical_id
                                      │
  subtypes           ┌────────────────▼────────────────┐
                     │ id            5                 │
                     │ vertical_id   1                 │
                     │ name          "Swiggy"          │
                     └────────────────┬────────────────┘
                                      │
                        (subtype_id, vertical_id)  ← ONE composite FK,
                                      │               not two separate ones
  expenses           ┌────────────────▼────────────────┐
                     │ id            91                │
                     │ vertical_id   1                 │
                     │ subtype_id    5                 │
                     │ amount_paise  120000   (₹1,200) │
                     │ spent_on      2026-08-01        │
                     └─────────────────────────────────┘
```

Storing `vertical_id` on the expense is what lets *"how much on Food this
month"* run without touching `subtypes` at all. See
[Constraints](#constraints-and-why-they-exist) for what stops the two columns
disagreeing.

Two rules fall out of this shape:

- **Every expense goes through a subtype.** `expenses.subtype_id` is `NOT NULL`,
  so nothing can be filed directly under a vertical, and a vertical with no
  subtypes cannot take an expense at all. Any vertical added later needs at
  least one subtype before it is usable — which is why `Other` is seeded with an
  `Uncategorized` beneath it.
- **Deleting works upward, never downward.** Every foreign key is `RESTRICT`, so
  a subtype with expenses and a vertical with subtypes both refuse to be
  deleted. Retiring either means setting `archived_at`.

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

## The seeded taxonomy

Ten verticals and 47 subtypes are seeded by
[`drizzle/0001_seed_taxonomy.sql`](../drizzle/0001_seed_taxonomy.sql). They are a
starting point, not a fixed list — everything here is editable in the app.

| Vertical | Subtypes |
| --- | --- |
| **Food** | Bistro, Dining Out, EatClub, Others, Swiggy, Swish, Zepto Café, Zomato |
| **Convenience** | Blinkit, Instamart, Others, Zepto |
| **Subscriptions** | Apps & Cloud, Electricity, Gas, Internet, Mobile, Music, Streaming, Water |
| **Transport** | Metro, Others, Rapido, Uber |
| **Health** | Diagnostics, Doctor, Fitness, Insurance, Medicines |
| **Shopping** | Clothing, Electronics, Home & Kitchen, Personal Care |
| **Leisure** | Books, Games, Hobbies, Movies & Events |
| **People** | Donations, Family Support, Festivals, Gifts |
| **Other** | Uncategorized |
| **Loans** | Credit Card Dues, Education Loan, Home Loan, Personal Loan, Vehicle Loan |

**Food and Convenience are filed by platform**, not by kind of purchase, because
the question worth answering is which app the money goes to. The other verticals
are filed by kind. Nothing in the schema cares, but it does mean the Food chart
reads as a merchant breakdown while the Health chart reads as a category one.

**The Food/Convenience line is what was bought, not which app it was bought in.**
`Bistro` is Blinkit's prepared-food arm and sits under Food; a Blinkit grocery
order sits under Convenience. Groceries have no subtype under Food at all —
they belong to Convenience.

**Loans records the full EMI, not just the interest.** Principal repayment does
build equity, but a spend tracker measures cash out the door, and splitting each
payment would mean re-deriving the amortisation split every month.

**There is deliberately no Investments vertical.** SIPs and similar are transfers
rather than spend — the money is still yours. There is no income or transfer
concept in this schema and no flag marking a row as non-spend, so an investment
logged as an expense would be indistinguishable from a dinner and would inflate
every total and every chart. Adding one later means deciding how spend totals
exclude it *before* inserting the vertical.

`Subscriptions` mixes utilities with streaming, and `Health`, `Shopping`,
`Leisure`, `People`, and `Loans` carry provisional subtypes that have not been
reviewed against real spending yet.

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

### Data migrations

Seed and backfill SQL goes in the same chain, written by hand into an empty
migration:

```bash
npx drizzle-kit generate --custom --name seed_taxonomy
```

**Seed data is a migration here, not a standalone seed script.** A script would
mean a database rebuilt from scratch comes up with correct tables and no
categories, which contradicts the whole reason migration SQL is committed. It
would also need `tsx` added purely to run one file.

Two things any data migration in this schema has to respect:

- **`id` is `GENERATED ALWAYS AS IDENTITY`**, so ids cannot be hardcoded, and
  they cannot be carried from one insert to the next. Child rows resolve their
  parent by name instead — see the `JOIN (VALUES ...)` in
  [`0001_seed_taxonomy.sql`](../drizzle/0001_seed_taxonomy.sql).
- **`ORDER BY` the select that feeds an insert.** Identity values are drawn in
  the order rows are produced, so without one the planner decides and the same
  file hands out different ids in different databases.

`ON CONFLICT DO NOTHING` needs no conflict target to catch the `lower(name)`
unique indexes, which is what leaves the seed safe to re-apply.

## Querying conventions

- **Every query goes through the Data Access Layer**, which calls `verifySession()`
  first. See [auth.md](auth.md) — that is the real security boundary.
- **Aggregate in SQL, not JavaScript.** Use `SUM(amount_paise) ... GROUP BY`
  rather than fetching rows and reducing them.
- **`SUM(integer)` returns `bigint`, which the driver hands back as a string.**
  Cast it (`SUM(amount_paise)::int`) or convert explicitly. The same applies to
  any `numeric` column.
- **Compute date ranges in `Asia/Kolkata`.** Server code runs in UTC, and IST is
  UTC+5:30, so anything between midnight and 5:29am IST is still the previous day
  in UTC. Deriving "this month" from the server clock puts an expense entered at
  00:30 IST on the 1st into the previous month.
