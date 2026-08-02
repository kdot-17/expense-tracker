import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * `updatedAt` is maintained by Drizzle's `$onUpdate`, so it only fires for
 * updates issued through Drizzle. A raw SQL `UPDATE` leaves it stale; making it
 * airtight would need a Postgres trigger, which is more machinery than this
 * app's single writer warrants.
 */
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Top-level expense categories. Editable but never deletable — retiring one is
 * done by setting `archivedAt`, which hides it from pickers while leaving every
 * expense underneath it resolvable.
 */
export const verticals = pgTable(
  "verticals",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // Case-insensitive uniqueness, so "Food" and "food" can't coexist. Postgres
    // has no expression support in UNIQUE *constraints*, so this has to be a
    // unique index — fine here, since nothing references it.
    uniqueIndex("verticals_name_lower_key").on(sql`lower(${t.name})`),
  ],
);

/**
 * Second level of the taxonomy. Deletable only while unused: the RESTRICT on
 * `expenses` below turns "has expenses" into a hard database-level refusal, so
 * delete covers typos and `archivedAt` covers retirement.
 */
export const subtypes = pgTable(
  "subtypes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    verticalId: integer("vertical_id")
      .notNull()
      // Verticals are not deletable in the app; RESTRICT is the backstop that
      // also stops a stray SQL DELETE from taking subtypes with it.
      .references(() => verticals.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // Scoped per vertical, so Shopping→Online and Food→Online can both exist.
    // `vertical_id` leading also makes this serve FK lookups by vertical, which
    // is why there is deliberately no separate index on `vertical_id`.
    uniqueIndex("subtypes_vertical_name_lower_key").on(
      t.verticalId,
      sql`lower(${t.name})`,
    ),
    // Target for the composite FK on `expenses` — a foreign key can only point
    // at columns that are provably unique. Declared as a constraint rather than
    // a bare unique index because it is self-documenting; Postgres takes either.
    unique("subtypes_id_vertical_id_key").on(t.id, t.verticalId),
  ],
);

/**
 * Individual expenses. All amounts are INR in integer paise — see
 * `src/lib/money.ts` for why floats are kept out of the pipeline entirely.
 */
export const expenses = pgTable(
  "expenses",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    verticalId: integer("vertical_id").notNull(),
    subtypeId: integer("subtype_id").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    // `date`, not `timestamp`: an expense happens on a day. IST is UTC+5:30, so
    // storing an instant would push anything entered between midnight and
    // 5:29am into the previous UTC day and misfile it in date-grouped totals.
    // `mode: "string"` keeps it a plain "YYYY-MM-DD" and keeps JS `Date`
    // timezone conversion out of the path entirely.
    spentOn: date("spent_on", { mode: "string" }).notNull(),
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    // Both ids are stored so vertical rollups need no join. This composite FK
    // is what stops them drifting: a subtype can only ever be paired with the
    // vertical it actually belongs to, enforced by Postgres rather than by
    // application discipline.
    foreignKey({
      columns: [t.subtypeId, t.verticalId],
      foreignColumns: [subtypes.id, subtypes.verticalId],
      name: "expenses_subtype_vertical_fk",
    }).onDelete("restrict"),
    check("expenses_amount_paise_positive", sql`${t.amountPaise} > 0`),
    // Plain ascending indexes. Postgres scans an index in either direction, so
    // these already serve `ORDER BY spent_on DESC` without a DESC declaration.
    index("expenses_spent_on_idx").on(t.spentOn),
    index("expenses_vertical_spent_on_idx").on(t.verticalId, t.spentOn),
    index("expenses_subtype_spent_on_idx").on(t.subtypeId, t.spentOn),
  ],
);
