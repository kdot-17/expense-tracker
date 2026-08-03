/**
 * The zero state. Nothing is wired to a data source yet, so every plot on the
 * page renders one of these in place of its canvas — the frame, the heading and
 * the layout all stay, which is the point: the scaffold is the deliverable.
 */
export function EmptyPlot({
  label = "No expenses yet",
  // Defaults to the line plot's proportions so an empty frame occupies exactly
  // the space its chart will. Callers pass the shape of the plot they stand in
  // for — an aspect ratio, never a fixed height, so the placeholder reflows
  // with its column like the canvas does.
  className = "aspect-[6/5] sm:aspect-[16/9] lg:aspect-[11/5] min-h-[17.5rem] sm:min-h-[21.25rem] max-h-[26.25rem]",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`border-rule bg-card flex w-full items-center justify-center border-2 ${className}`}
    >
      <p className="text-muted text-micro font-semibold tracking-[0.2em] uppercase">
        {label}
      </p>
    </div>
  );
}
