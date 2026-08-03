/**
 * The zero state. Nothing is wired to a data source yet, so every plot on the
 * page renders one of these in place of its canvas — the frame, the heading and
 * the layout all stay, which is the point: the scaffold is the deliverable.
 */
export function EmptyPlot({
  label = "No expenses yet",
  className = "h-[280px] sm:h-[340px]",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`border-rule bg-card flex w-full items-center justify-center border-2 ${className}`}
    >
      <p className="text-muted text-[10px] font-semibold tracking-[0.2em] uppercase">
        {label}
      </p>
    </div>
  );
}
