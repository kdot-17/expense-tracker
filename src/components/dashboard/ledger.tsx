import { EXPENSES } from "@/lib/expenses";
import { formatPaiseWhole } from "@/lib/money";
import { slotOf } from "@/lib/taxonomy";

export function Ledger() {
  return (
    <div className="border-2 border-rule bg-card">
      {/* Scrolls in both axes, so it needs to be focusable — a keyboard-only
          reader cannot reach a scroll container that nothing can focus. */}
      <div
        className="max-h-[560px] overflow-x-auto overflow-y-auto"
        tabIndex={0}
        role="group"
        aria-label="The ledger — every expense this month, scrolls"
      >
        <table className="w-full min-w-[420px] border-collapse text-left">
          <caption className="sr-only">
            Every expense this month in date order, with subtype, vertical and
            amount.
          </caption>
          <thead className="sticky top-0 z-10 bg-rule text-page">
            <tr className="text-[10px] font-semibold uppercase tracking-[0.18em]">
              <th scope="col" className="px-2 py-2.5 sm:px-3">
                Day
              </th>
              <th scope="col" className="px-2 py-2.5 sm:px-3">
                Subtype
              </th>
              <th scope="col" className="px-2 py-2.5 sm:px-3">
                Vertical
              </th>
              <th scope="col" className="px-2 py-2.5 text-right sm:px-3">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {EXPENSES.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-muted px-3 py-10 text-center text-[10px] font-semibold tracking-[0.2em] uppercase"
                >
                  No expenses yet
                </td>
              </tr>
            ) : null}
            {EXPENSES.map((expense, i) => {
              // Index-based lookback — no accumulator reassigned during render.
              const opensDay = i === 0 || EXPENSES[i - 1].day !== expense.day;
              const slot = slotOf(expense.vertical);

              return (
                <tr
                  key={`${expense.day}-${expense.vertical}-${expense.subtype}-${i}`}
                  className={`border-b border-grid hover:bg-page ${
                    opensDay ? "border-t-rule border-t-2" : ""
                  }`}
                >
                  <td
                    className="px-2 py-1.5 align-middle text-[15px] leading-none tabular-nums sm:px-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {opensDay ? expense.day : ""}
                  </td>
                  <td className="px-2 py-1.5 text-[13px] text-ink sm:px-3">
                    {expense.subtype}
                    {/* The note is the only free text in the row, and it is what
                        makes two ₹340 Swiggy lines tell apart. */}
                    {expense.note ? (
                      <span className="hidden text-muted lg:inline"> · {expense.note}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5 sm:px-3">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 border-2 border-rule"
                        style={{ background: `var(--slot-${slot})` }}
                      />
                      <span className="text-[12px] whitespace-nowrap text-ink-2">
                        {expense.vertical}
                      </span>
                    </span>
                  </td>
                  <td
                    className="px-2 py-1.5 text-right text-[15px] tabular-nums sm:px-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {formatPaiseWhole(expense.amountPaise)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
