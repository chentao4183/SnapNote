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
