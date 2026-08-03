import { byGroup, formatINR, groupVsPrevious } from "@/lib/transactions";

/**
 * A diverging strip, not a chart: one shared zero line down the middle, bars
 * scaled to the largest absolute move in either direction. Direction and a
 * signed number both carry the sign, so the colour is only ever identity.
 */
export function VersusPrevious() {
  const deltas = groupVsPrevious();
  const groups = byGroup();
  const max = Math.max(...deltas.map((entry) => Math.abs(entry.delta)));

  return (
    <div className="flex flex-col">
      <div className="flex items-end justify-between border-b-2 border-rule pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          ◀ Spent less
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          Spent more ▶
        </span>
      </div>

      <ul>
        {deltas.map((entry, i) => {
          const width = (Math.abs(entry.delta) / max) * 50;
          const up = entry.delta > 0;
          const flat = entry.delta === 0;

          return (
            <li
              key={entry.group}
              className="grid grid-cols-[96px_minmax(0,1fr)_76px] items-center gap-2 border-b border-grid py-2 sm:grid-cols-[168px_minmax(0,1fr)_92px] sm:gap-3"
              title={`${entry.group}: ${formatINR(groups[i].amount)} this month, ${
                flat ? "identical to last month" : `${up ? "+" : "−"}${formatINR(Math.abs(entry.delta))} on last month`
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-3 shrink-0 border-2 border-rule"
                  style={{ background: `var(--slot-${i})` }}
                />
                <span className="min-w-0 text-[11px] leading-tight font-medium break-words text-ink sm:text-[13px]">
                  {entry.group}
                </span>
              </span>

              <span className="relative block h-7">
                <span
                  aria-hidden
                  className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-rule"
                />
                {flat ? (
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-1/2 h-2 w-4 -translate-x-1/2 -translate-y-1/2 bg-rule"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="absolute top-0.5 bottom-0.5"
                    style={{
                      background: `var(--slot-${i})`,
                      outline: "2px solid var(--rule)",
                      width: `${width}%`,
                      left: up ? "50%" : undefined,
                      right: up ? undefined : "50%",
                    }}
                  />
                )}
              </span>

              <span className="text-right text-[11px] tabular-nums sm:text-[13px]">
                {flat ? (
                  <span className="text-muted">no change</span>
                ) : (
                  <span style={{ fontFamily: "var(--font-display)" }}>
                    {up ? "+" : "−"}
                    {formatINR(Math.abs(entry.delta))}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
