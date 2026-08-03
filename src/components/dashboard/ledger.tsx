import { categorySlot } from "@/lib/palette";
import { CATEGORY_TO_GROUP, formatINR, TRANSACTIONS } from "@/lib/transactions";

export function Ledger() {
  return (
    <div className="border-2 border-rule bg-card">
      <div className="max-h-[560px] overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <caption className="sr-only">
            Every debit this month in date order, with merchant, category and
            amount.
          </caption>
          <thead className="sticky top-0 z-10 bg-rule text-page">
            <tr className="text-[10px] font-semibold uppercase tracking-[0.18em]">
              <th scope="col" className="px-2 py-2.5 sm:px-3">
                Day
              </th>
              <th scope="col" className="px-2 py-2.5 sm:px-3">
                Merchant
              </th>
              <th scope="col" className="px-2 py-2.5 sm:px-3">
                Category
              </th>
              <th scope="col" className="px-2 py-2.5 text-right sm:px-3">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {TRANSACTIONS.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-muted px-3 py-10 text-center text-[10px] font-semibold tracking-[0.2em] uppercase"
                >
                  No transactions yet
                </td>
              </tr>
            ) : null}
            {TRANSACTIONS.map((txn, i) => {
              // Index-based lookback — no accumulator reassigned during render.
              const opensDay = i === 0 || TRANSACTIONS[i - 1].day !== txn.day;
              const slot = categorySlot(txn.category);

              return (
                <tr
                  key={`${txn.day}-${txn.merchant}-${i}`}
                  className={`border-b border-grid hover:bg-page ${
                    opensDay ? "border-t-rule border-t-2" : ""
                  }`}
                >
                  <td
                    className="px-2 py-1.5 align-middle text-[15px] leading-none tabular-nums sm:px-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {opensDay ? txn.day : ""}
                  </td>
                  <td className="px-2 py-1.5 text-[13px] text-ink sm:px-3">
                    {txn.merchant}
                  </td>
                  <td className="px-2 py-1.5 sm:px-3">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 border-2 border-rule"
                        style={{ background: `var(--slot-${slot})` }}
                      />
                      <span className="text-[12px] whitespace-nowrap text-ink-2">
                        {txn.category}
                        <span className="hidden text-muted lg:inline">
                          {" "}
                          · {CATEGORY_TO_GROUP[txn.category]}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td
                    className="px-2 py-1.5 text-right text-[15px] tabular-nums sm:px-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {formatINR(txn.amount)}
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
