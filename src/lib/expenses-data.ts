import "server-only";

import { asc, between, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { expenses, subtypes, verticals } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import type { Expense, MonthData } from "@/lib/expenses";
import { previousPeriodOf, type Period } from "@/lib/period";
import { VERTICAL_ORDER, type Vertical } from "@/lib/taxonomy";

/**
 * A vertical name straight from the database, checked against the taxonomy.
 *
 * Throws rather than casting: `slotOf()` on a name the palette has never heard
 * of returns -1, which paints `var(--slot--1)` — nothing — while the totals
 * keep counting the money. A dashboard that disagrees with itself is worse
 * than one that refuses to render, so an unknown vertical is a loud failure
 * until `src/lib/taxonomy.ts` learns the name.
 */
function asVertical(name: string): Vertical {
  if ((VERTICAL_ORDER as readonly string[]).includes(name)) {
    return name as Vertical;
  }
  throw new Error(
    `Vertical "${name}" is not in VERTICAL_ORDER — update src/lib/taxonomy.ts before rendering it.`,
  );
}

/**
 * The one database read behind the dashboard: the period's rows plus the
 * previous month's totals, in a single `db.batch()`.
 *
 * A batch matters twice over on neon-http. The driver is one HTTP roundtrip
 * per query — Singapore per query, from wherever the server runs — and a
 * batch is one roundtrip for both. It also executes as a single
 * non-interactive transaction, so the rows and the previous-month totals are
 * a consistent snapshot rather than two reads an insert could land between.
 *
 * The current month's aggregates are deliberately *not* SQL: the ledger needs
 * every row anyway, so the page derives its totals from rows it already holds
 * (see docs/conventions.md). SQL aggregation is for months whose rows never
 * ship — the previous month is `SUM ... GROUP BY`, not a row fetch.
 */
export async function getMonthData(period: Period): Promise<MonthData> {
  // The DAL is the real boundary — every read passes through it, and the
  // `cache()` wrapper makes the repeat call from the page free.
  await verifySession();

  const db = getDb();
  const previous = previousPeriodOf(period);

  const [rows, previousGroups] = await db.batch([
    // The month's rows, oldest first — the ledger's own order. Names come from
    // a join rather than the taxonomy module: the database is the authority on
    // what an id is called, and seed order differs from slot order on purpose.
    db
      .select({
        spentOn: expenses.spentOn,
        vertical: verticals.name,
        subtype: subtypes.name,
        amountPaise: expenses.amountPaise,
        note: expenses.note,
      })
      .from(expenses)
      .innerJoin(subtypes, eq(expenses.subtypeId, subtypes.id))
      .innerJoin(verticals, eq(expenses.verticalId, verticals.id))
      .where(between(expenses.spentOn, period.firstDay, period.lastDay))
      .orderBy(asc(expenses.spentOn), asc(expenses.id)),

    // Previous month, aggregated in SQL — these rows never ship. `SUM(integer)`
    // is bigint, which the driver returns as a string; the ::int cast keeps it
    // a number (docs/conventions.md).
    db
      .select({
        vertical: verticals.name,
        totalPaise: sql<number>`sum(${expenses.amountPaise})::int`,
      })
      .from(expenses)
      .innerJoin(verticals, eq(expenses.verticalId, verticals.id))
      .where(between(expenses.spentOn, previous.firstDay, previous.lastDay))
      .groupBy(verticals.name),
  ]);

  const monthExpenses: Expense[] = rows.map((row) => ({
    // "YYYY-MM-DD" → day of month, by slice — never through a JS Date.
    day: Number(row.spentOn.slice(8, 10)),
    vertical: asVertical(row.vertical),
    subtype: row.subtype,
    amountPaise: row.amountPaise,
    ...(row.note === null ? {} : { note: row.note }),
  }));

  // "Prior month on file" means rows in the previous calendar month itself,
  // not merely anything older. History with a gap month between would
  // otherwise report "last month: ₹0" — a figure describing a month nobody
  // recorded, which the CHECK constraint means no recorded month can produce.
  const hasHistory = previousGroups.length > 0;

  return {
    expenses: monthExpenses,
    // Derived from its own breakdown, so the KPI figure and the per-vertical
    // strip cannot disagree about what last month was.
    previousMonthTotalPaise: hasHistory
      ? previousGroups.reduce((sum, group) => sum + group.totalPaise, 0)
      : null,
    previousMonthByVertical: hasHistory
      ? Object.fromEntries(
          previousGroups.map((group) => [asVertical(group.vertical), group.totalPaise]),
        )
      : null,
  };
}
