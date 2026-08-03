"use client";

import { useActionState, useEffect, useRef } from "react";

import { addExpense, type AddExpenseState } from "@/app/actions";
import { SUBTYPES, subtypeKey, VERTICAL_ORDER } from "@/lib/taxonomy";

const initialState: AddExpenseState = {};

const MICRO = "text-micro font-semibold uppercase tracking-[0.2em]";

/** Square, heavy-ruled, no radius — the same field the login form established. */
const fieldClasses =
  "border-rule bg-card text-ink w-full border-2 px-3 py-2 text-sm outline-none";

/**
 * The masthead's Add expense control and the dialog it opens — a native
 * `<dialog>` via `showModal()`, which is the design system's one sanctioned
 * overlay (§7): the top layer escapes the board's viewport lock without
 * touching it, and focus trapping, `Esc` and the backdrop come from the
 * platform rather than from code here.
 *
 * On success the action returns `saved` and the dialog closes over a board
 * that the same response already re-rendered — the new row standing in the
 * ledger is the receipt, so the dialog has no "saved" state of its own.
 *
 * Every `defaultValue` reads from `state.values`: React 19 resets uncontrolled
 * fields when a form action resolves, so a failed submit would otherwise hand
 * back an empty form with an error about what was just wiped.
 */
export function AddExpense({ today }: { today: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // React 19: returns [state, action, pending] and the action receives
  // (prevState, formData) — not the React 18 useFormState two-tuple.
  const [state, formAction, pending] = useActionState(addExpense, initialState);

  useEffect(() => {
    if (state.saved) dialogRef.current?.close();
  }, [state]);

  // The error names one field; only that field claims the alert. Spraying
  // aria-describedby across all four would read the subtype's error to
  // someone standing in the note field.
  const describe = (field: NonNullable<AddExpenseState["field"]>) =>
    state.error && state.field === field ? "add-error" : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={`${MICRO} border-on-bar hover:bg-on-bar hover:text-bar border-2 px-2.5 py-1`}
      >
        Add expense
      </button>

      {/* `backdrop:` — ink over the board, translucent so the board stays
          visibly the thing being added to. Colour is the token, not a hex. */}
      <dialog
        ref={dialogRef}
        aria-labelledby="add-expense-title"
        className="border-rule bg-card text-ink @container m-auto w-full max-w-md border-2 p-6 backdrop:bg-ink/55 sm:p-8"
      >
        <h2
          id="add-expense-title"
          className="font-display text-signin leading-[0.85] uppercase"
        >
          Add
          <br />
          Expense
        </h2>
        <p className={`${MICRO} text-muted mt-3 mb-8`}>A new row for the ledger</p>

        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="amount" className={MICRO}>
              Amount
            </label>
            <div className="flex">
              {/* A punched-out block, the same figure/ground as the tile
                  headers. aria-hidden: the label already says Amount, and the
                  parser accepts a typed ₹ anyway. */}
              <span
                aria-hidden="true"
                className="bg-rule text-page flex shrink-0 items-center px-3 text-sm font-semibold"
              >
                ₹
              </span>
              <input
                id="amount"
                name="amount"
                // Text with a decimal keypad, never type="number" — the
                // browser must hand over the raw string, not a float
                // (docs/money.md). First focusable, so showModal lands here.
                type="text"
                inputMode="decimal"
                autoComplete="off"
                required
                defaultValue={state.values?.amount}
                aria-describedby={describe("amount")}
                // The prefix block supplies the left edge, so the input drops
                // its own left border — two borders would paint a 4px rule.
                className={`${fieldClasses} border-l-0 tabular-nums`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="subtype" className={MICRO}>
              Subtype
            </label>
            {/* One grouped select, zero extra state: the (vertical, name) pair
                stays atomic in a single control, and the optgroup label
                carries the vertical so the option text stays the bare name —
                "Others" under a heading that already says FOOD needs no
                qualifying. */}
            <select
              // React honours a select's defaultValue only at mount, so the
              // values echo cannot reach an already-mounted select the way it
              // reaches the inputs. Keying on the echo remounts it after a
              // failed submit, which is what makes the choice survive.
              key={state.values?.subtype ?? "initial"}
              id="subtype"
              name="subtype"
              required
              defaultValue={state.values?.subtype ?? ""}
              aria-describedby={describe("subtype")}
              className={fieldClasses}
            >
              <option value="" disabled>
                Choose a subtype…
              </option>
              {VERTICAL_ORDER.map((vertical) => (
                <optgroup key={vertical} label={vertical}>
                  {SUBTYPES[vertical].map((name) => (
                    <option key={name} value={subtypeKey({ vertical, name })}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="spent-on" className={MICRO}>
              Spent on
            </label>
            {/* Submits "YYYY-MM-DD" by spec whatever the display locale — the
                schema's own shape, no JS Date anywhere on the path. Defaults
                to today in IST, computed by the server that rendered the
                band. */}
            <input
              id="spent-on"
              name="spentOn"
              type="date"
              required
              defaultValue={state.values?.spentOn ?? today}
              aria-describedby={describe("spentOn")}
              className={fieldClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="note" className={MICRO}>
              Note — optional
            </label>
            {/* Single line on purpose: the ledger renders the note inline
                after the subtype, so multi-line text has nowhere to go. The
                length cap is presentation discipline, not validation — the
                column is text. */}
            <input
              id="note"
              name="note"
              type="text"
              maxLength={140}
              autoComplete="off"
              defaultValue={state.values?.note}
              className={fieldClasses}
            />
          </div>

          {state.error ? (
            <p
              id="add-error"
              role="alert"
              // Slot 0 is the identity red; the message also says what is
              // wrong, so colour is never the only carrier.
              className="border-2 px-3 py-2 text-sm font-medium"
              style={{
                borderColor: "var(--slot-0)",
                background: "var(--slot-0)",
                color: "var(--on-0)",
              }}
            >
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="bg-rule text-page mt-1 px-3 py-2.5 text-tick font-semibold tracking-[0.2em] uppercase disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add expense"}
          </button>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className={`${MICRO} text-muted hover:text-ink self-center`}
          >
            Cancel
          </button>
        </form>
      </dialog>
    </>
  );
}
