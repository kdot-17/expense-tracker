"use server";

import { NeonDbError } from "@neondatabase/serverless";
import { and, DrizzleQueryError, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { expenses, subtypes, verticals } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { parseRupeesToPaise } from "@/lib/money";
import { isValidDateString } from "@/lib/period";

export type AddExpenseState = {
  error?: string;
  /** Which field the error names, so the form can point aria-describedby at it. */
  field?: "amount" | "subtype" | "spentOn";
  /**
   * Echo of what was submitted. React 19 resets uncontrolled fields when a
   * form action resolves, so without this a failed submit would wipe the
   * reader's typing — every `defaultValue` in the form reads from here.
   */
  values?: { amount: string; subtype: string; spentOn: string; note: string };
  /** Set on success — the dialog watches this to close itself. */
  saved?: true;
};

export async function addExpense(
  _prevState: AddExpenseState,
  formData: FormData,
): Promise<AddExpenseState> {
  // Always first: a server action is reachable by direct POST, not only
  // through the form, so the page-level check protects nothing here.
  await verifySession();

  const amountRaw = String(formData.get("amount") ?? "").trim();
  const subtypeRaw = String(formData.get("subtype") ?? "").trim();
  const spentOn = String(formData.get("spentOn") ?? "").trim();
  const noteRaw = String(formData.get("note") ?? "").trim();

  const values = { amount: amountRaw, subtype: subtypeRaw, spentOn, note: noteRaw };
  const fail = (field: AddExpenseState["field"], error: string): AddExpenseState => ({
    error,
    field,
    values,
  });

  if (!amountRaw) {
    return fail("amount", "Enter an amount.");
  }
  // `parseRupeesToPaise` treats "0" as a valid parse; rejecting it is this
  // caller's job (docs/money.md) — the CHECK constraint is the backstop.
  const amountPaise = parseRupeesToPaise(amountRaw);
  if (amountPaise === null) {
    return fail("amount", "Enter the amount in rupees, like 249 or 1,249.50.");
  }
  if (amountPaise === 0) {
    return fail("amount", "An expense must be more than ₹0.");
  }

  // The picker submits `subtypeKey`: "Vertical/Subtype name". Split on the
  // FIRST slash only — vertical names are frozen and slash-free, but subtypes
  // are user-editable eventually, and a name containing a slash must survive.
  const slash = subtypeRaw.indexOf("/");
  const verticalName = slash === -1 ? "" : subtypeRaw.slice(0, slash).trim();
  const subtypeName = slash === -1 ? "" : subtypeRaw.slice(slash + 1).trim();
  if (!verticalName || !subtypeName) {
    return fail("subtype", "Pick a subtype.");
  }

  if (!spentOn) {
    return fail("spentOn", "Enter the date.");
  }
  // String checks only — never `new Date(spentOn)`, which would helpfully
  // roll "2026-02-30" over to March instead of rejecting it.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) {
    return fail("spentOn", "Enter the date as YYYY-MM-DD.");
  }
  if (!isValidDateString(spentOn)) {
    return fail("spentOn", "That date doesn't exist — check the day and month.");
  }

  // Names → the (subtype id, vertical id) pair. Case-insensitive to match the
  // database's own lower() uniqueness, and archived rows excluded at both
  // levels: archiving hides a subtype from pickers, and a direct POST must
  // not be able to file against a retired one.
  const db = getDb();
  const match = await db
    .select({ subtypeId: subtypes.id, verticalId: subtypes.verticalId })
    .from(subtypes)
    .innerJoin(verticals, eq(subtypes.verticalId, verticals.id))
    .where(
      and(
        sql`lower(${verticals.name}) = lower(${verticalName})`,
        sql`lower(${subtypes.name}) = lower(${subtypeName})`,
        isNull(subtypes.archivedAt),
        isNull(verticals.archivedAt),
      ),
    )
    .limit(1);

  if (match.length === 0) {
    return fail("subtype", `There's no "${subtypeName}" under ${verticalName}.`);
  }

  try {
    // Both ids on the row, exactly as the composite FK stores them — the
    // database re-checks the pairing, so a mismatched pair cannot land.
    await db.insert(expenses).values({
      verticalId: match[0].verticalId,
      subtypeId: match[0].subtypeId,
      amountPaise,
      spentOn,
      note: noteRaw === "" ? null : noteRaw,
    });
  } catch (error) {
    // Constraint violations come back readable, never as a raw Postgres error
    // (docs/conventions.md). Drizzle wraps the driver's error; the Postgres
    // code sits on the cause.
    const cause = error instanceof DrizzleQueryError ? error.cause : error;
    if (cause instanceof NeonDbError && cause.code === "23503") {
      // The composite-FK race: the subtype was deleted between the lookup
      // above and this insert. neon-http has no interactive transactions, so
      // the two steps cannot be atomic — the FK is the honest backstop.
      return fail("subtype", "That subtype was just removed. Pick another and try again.");
    }
    return { error: "Couldn't save the expense. Try again.", values };
  }

  // The board is the receipt. The form sits in a dialog over `/`, so there is
  // no navigation: revalidatePath makes this same response carry a freshly
  // rendered board, and the dialog closes on `saved` to reveal it.
  revalidatePath("/");
  return { saved: true };
}
