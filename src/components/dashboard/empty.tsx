/**
 * The zero state. Nothing is wired to a data source yet, so every plot on the
 * page renders one of these in place of its canvas — the frame, the heading and
 * the layout all stay, which is the point: the scaffold is the deliverable.
 */
import { LINE_FRAME } from "./frames";

export function EmptyPlot({
  label = "No expenses yet",
  // The line plot's own frame, imported rather than copied, so an empty plot
  // occupies exactly the space its chart would. Callers pass the shape of the
  // plot they stand in for — always a frame, never a fixed height.
  className = LINE_FRAME,
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
