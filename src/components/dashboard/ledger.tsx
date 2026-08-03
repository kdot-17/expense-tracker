import { EXPENSES } from "@/lib/expenses";
import { formatPaise } from "@/lib/money";
import { slotOf } from "@/lib/taxonomy";

/**
 * `fill` grows the scroll box into its parent instead of capping it at 560px.
 *
 * The `max-lg:` floor is not decoration: below `lg` the board is one auto-sized
 * column, so `flex-1` resolves against nothing and the table collapses to its
 * header. At `lg` the row height is the authority and the floor is dropped.
 */
export function Ledger({ fill = false }: { fill?: boolean }) {
  return (
    <div
      className={`border-2 border-rule bg-card ${fill ? "flex min-h-0 flex-1 flex-col" : ""}`}
    >
      {/* Scrolls in both axes, so it needs to be focusable — a keyboard-only
          reader cannot reach a scroll container that nothing can focus. */}
      <div
        // Heights in rem, not px: at a larger browser font the rows grow, and
        // a frozen box would simply show fewer of them.
        className={`overflow-x-auto overflow-y-auto ${
          fill ? "min-h-0 flex-1 max-lg:min-h-[26.25rem]" : "max-h-[35rem]"
        }`}
        tabIndex={0}
        role="group"
        aria-label="The ledger — every expense this month, scrolls"
      >
        {/* The one deliberate scroll box on the page (design-system §7). The
            floor is in rem so it tracks the type it has to fit, rather than
            assuming a 16px root. */}
        <table className="w-full min-w-[26.25rem] border-collapse text-left">
          <caption className="sr-only">
            Every expense this month in date order, with subtype, vertical and
            amount.
          </caption>
          <thead className="sticky top-0 z-10 bg-rule text-page">
            <tr className="text-micro font-semibold uppercase tracking-[0.18em]">
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
                  className="text-muted px-3 py-10 text-center text-micro font-semibold tracking-[0.2em] uppercase"
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
                    className="px-2 py-1.5 align-middle text-lede leading-none tabular-nums sm:px-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {opensDay ? expense.day : ""}
                  </td>
                  <td className="text-note text-ink px-2 py-1.5 sm:px-3">
                    {expense.subtype}
                    {/* The note is the only free text in the row, and it is what
                        makes two ₹340 Swiggy lines tell apart. */}
                    {expense.note ? (
                      <span className="text-muted hidden lg:inline"> · {expense.note}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5 sm:px-3">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 border-2 border-rule"
                        style={{ background: `var(--slot-${slot})` }}
                      />
                      <span className="text-ink-2 text-meta whitespace-nowrap">
                        {expense.vertical}
                      </span>
                    </span>
                  </td>
                  <td
                    className="px-2 py-1.5 text-right text-lede tabular-nums sm:px-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {formatPaise(expense.amountPaise)}
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
