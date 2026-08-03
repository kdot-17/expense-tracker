/**
 * Plot frame shapes, shared by the charts and by the empty state that stands in
 * for them.
 *
 * They live in their own module because `charts.tsx` imports `EmptyPlot` from
 * `empty.tsx`, so `empty.tsx` cannot import back from `charts.tsx`. The
 * alternative — the same class string written out in both files — is how the
 * `max-h` ceiling came to exist in one copy and not the other, which made an
 * empty plot 548px tall beside a 420px chart.
 *
 * Chart.js needs a parent with a definite height (design-system §5.4). An
 * aspect ratio gives it one derived from the width, so a plot reflows with its
 * column instead of stepping at a breakpoint.
 *
 * The `min-h` floors are not a hedge. At `lg` the 12-column grid takes over and
 * these columns get *narrower* than they were when stacked — the line plot goes
 * from a 720px column at 768px wide to a 537px one at 1024px — so a pure ratio
 * would squash a time series to 244px exactly where there is most room on the
 * page. The `max-h` ceilings stop the opposite: at the wide end of the `sm`
 * band a bare ratio reached 650px. Both bounds are rem, so they track the type
 * they have to stay legible against; the ratio governs between them.
 */
export const LINE_FRAME =
  "aspect-[6/5] sm:aspect-[16/9] lg:aspect-[11/5] min-h-[17.5rem] sm:min-h-[21.25rem] max-h-[26.25rem]";

export const BAR_FRAME =
  "aspect-square sm:aspect-[3/2] lg:aspect-[4/3] min-h-[21.25rem] sm:min-h-[25rem] max-h-[30rem]";
