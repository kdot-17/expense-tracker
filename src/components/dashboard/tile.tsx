/**
 * A tile is what a section became when the page stopped being a document.
 *
 * The old layout gave every section a poster-scale heading and a 2px rule under
 * it. A board cannot afford seven of those, so the heading shrinks to a
 * micro-caps label welded to the top of the box it names — the number survives,
 * because it is what lets one module be pointed at from another.
 */

const MICRO = "text-micro font-semibold uppercase tracking-[0.2em]";

export function Tile({
  index,
  title,
  aside,
  children,
  className,
}: {
  index: string;
  title: string;
  /** A figure or control that belongs to the tile's header rather than its body. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border-rule bg-card flex min-h-0 min-w-0 flex-col border-2 ${className ?? ""}`}
    >
      <header className="bg-rule text-page flex shrink-0 items-baseline gap-2.5 px-2.5 py-1.5">
        <span className={`${MICRO} shrink-0 tabular-nums opacity-60`}>{index}</span>
        <h2 className={`${MICRO} min-w-0 flex-1 truncate`}>{title}</h2>
        {aside ? <span className={`${MICRO} shrink-0`}>{aside}</span> : null}
      </header>
      {/* `overflow-hidden` is load-bearing, not tidiness: a module whose own
          scroll box is taller than the cell it was dealt paints straight over
          its neighbours otherwise — the pie's ten-row legend did exactly that,
          across the KPI strip above it. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2.5">{children}</div>
    </section>
  );
}
