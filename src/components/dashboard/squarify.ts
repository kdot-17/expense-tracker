/**
 * A squarified treemap, ~90 lines, no dependency. Bruls/Huizing/van Wijk:
 * lay each row along the shorter side of what's left, and stop adding to a row
 * the moment the worst aspect ratio in it starts getting worse.
 *
 * Everything is unitless; the caller renders the rects as percentages, so the
 * *areas* stay proportional whatever the container's aspect turns out to be.
 */

export type Rect = { x: number; y: number; w: number; h: number };
export type Placed<T> = { item: T; rect: Rect };

function worst(row: number[], side: number): number {
  if (row.length === 0) return Number.POSITIVE_INFINITY;
  const sum = row.reduce((a, b) => a + b, 0);
  if (sum <= 0 || side <= 0) return Number.POSITIVE_INFINITY;
  const max = Math.max(...row);
  const min = Math.min(...row);
  const s2 = sum * sum;
  const w2 = side * side;
  return Math.max((w2 * max) / s2, s2 / (w2 * min));
}

/** Places one row against the short edge and returns what is left over. */
function placeRow<T>(
  row: { item: T; area: number }[],
  rect: Rect,
  out: Placed<T>[],
): Rect {
  const sum = row.reduce((a, b) => a + b.area, 0);
  if (sum <= 0) return rect;

  // Row runs along the shorter side; its thickness eats into the longer one.
  const vertical = rect.h <= rect.w;
  const side = vertical ? rect.h : rect.w;
  const thickness = Math.min(sum / side, vertical ? rect.w : rect.h);

  let offset = 0;
  for (const entry of row) {
    const length = (entry.area / sum) * side;
    out.push({
      item: entry.item,
      rect: vertical
        ? { x: rect.x, y: rect.y + offset, w: thickness, h: length }
        : { x: rect.x + offset, y: rect.y, w: length, h: thickness },
    });
    offset += length;
  }

  return vertical
    ? { x: rect.x + thickness, y: rect.y, w: rect.w - thickness, h: rect.h }
    : { x: rect.x, y: rect.y + thickness, w: rect.w, h: rect.h - thickness };
}

/**
 * `values` are amounts; they get scaled to fill `rect` exactly. Items are
 * packed largest-first (that is what makes the blocks square) but the caller
 * keeps its own colour mapping, so no entity ever changes colour.
 */
export function squarify<T>(
  items: { item: T; value: number }[],
  rect: Rect,
): Placed<T>[] {
  const positive = items.filter((entry) => entry.value > 0);
  const total = positive.reduce((a, b) => a + b.value, 0);
  if (total <= 0 || rect.w <= 0 || rect.h <= 0) return [];

  const scale = (rect.w * rect.h) / total;
  const queue = [...positive]
    .sort((a, b) => b.value - a.value)
    .map((entry) => ({ item: entry.item, area: entry.value * scale }));

  const out: Placed<T>[] = [];
  let remaining: Rect = { ...rect };
  let row: { item: T; area: number }[] = [];

  while (queue.length > 0) {
    const next = queue[0];
    const side = Math.min(remaining.w, remaining.h);
    const current = row.map((entry) => entry.area);
    const grown = [...current, next.area];

    if (row.length === 0 || worst(grown, side) <= worst(current, side)) {
      row.push(next);
      queue.shift();
    } else {
      remaining = placeRow(row, remaining, out);
      row = [];
    }
  }

  if (row.length > 0) placeRow(row, remaining, out);

  return out;
}
