import type { Rect } from "../types/annotation";
import type { Point } from "./corners";

/**
 * Intersection of the ray from the rect CENTER toward `point` with the rect
 * border. Mirrors ellipseBoundaryPoint so the smart-annotation arrow start
 * behaves the same for rect and ellipse targets: the start→point line always
 * passes through the center, keeping the arrow's extended line on the center.
 *
 * The border is the first plane the ray (center + t*(point-center), t >= 0)
 * crosses; for an outside point that is the smallest positive t among the
 * four edges. An inside point clamps to the same exit edge.
 */
export function nearestRectEdgePoint(rect: Rect, point: Point): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;

  if (halfW <= 0 && halfH <= 0) return { x: cx, y: cy };

  const dx = point.x - cx;
  const dy = point.y - cy;
  if (dx === 0 && dy === 0) return { x: cx + halfW, y: cy };

  // t at which the ray reaches each border plane; pick the smallest positive
  // (the first edge crossed going outward from the center).
  const tx = dx === 0 ? Infinity : (dx > 0 ? halfW : -halfW) / dx;
  const ty = dy === 0 ? Infinity : (dy > 0 ? halfH : -halfH) / dy;
  const t = Math.min(tx, ty);

  return { x: cx + dx * t, y: cy + dy * t };
}
