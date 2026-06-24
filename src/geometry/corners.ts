import type { Corner, Rect } from "../types/annotation";

export interface Point {
  x: number;
  y: number;
}

export function cornerPoint(rect: Rect, corner: Corner): Point {
  switch (corner) {
    case "tl":
      return { x: rect.x, y: rect.y };
    case "tr":
      return { x: rect.x + rect.width, y: rect.y };
    case "bl":
      return { x: rect.x, y: rect.y + rect.height };
    case "br":
      return { x: rect.x + rect.width, y: rect.y + rect.height };
  }
}

export function nearestCorner(rect: Rect, p: Point): Corner {
  const corners: Corner[] = ["tl", "tr", "bl", "br"];
  let best: Corner = "tr";
  let bestDist = Infinity;
  for (const c of corners) {
    const cp = cornerPoint(rect, c);
    const d = Math.hypot(cp.x - p.x, cp.y - p.y);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/**
 * Map a drag direction (start → anchor) to the target-box corner that occupies
 * the same quadrant. This lets the free-arrow (no-target) mode reuse the SAME
 * labelBoxOffset geometry as the target-box mode: whichever corner the arrow
 * "starts from", the label extends the same way.
 *
 *   start is left+above the anchor → "tl"   start right+above → "tr"
 *   start is left+below  the anchor → "bl"   start right+below → "br"
 *
 * An exact diagonal (dx===dy===0, or one axis exactly 0) is broken by the
 * horizontal/vertical sign so the result is always a concrete corner.
 */
export function directionToCorner(start: Point, anchor: Point): Corner {
  const dx = anchor.x - start.x;
  const dy = anchor.y - start.y;
  // Quadrant of `start` relative to `anchor` mirrors a rect corner: a start to
  // the left+above the anchor is the "tl" corner, etc. Ties (dx or dy === 0)
  // fall to the positive side so the result is always a concrete corner.
  const h = dx >= 0 ? "l" : "r"; // start left of anchor → label edge "left"
  const v = dy >= 0 ? "t" : "b"; // start above anchor → label edge "top"
  return `${v}${h}` as Corner;
}
