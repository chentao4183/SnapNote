import type { Rect } from "../types/annotation";
import type { Point } from "./corners";

export function ellipseBoundaryPoint(bounds: Rect, point: Point): Point {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const rx = bounds.width / 2;
  const ry = bounds.height / 2;

  if (rx <= 0 || ry <= 0) return { x: cx, y: cy };

  const dx = point.x - cx;
  const dy = point.y - cy;
  if (dx === 0 && dy === 0) return { x: cx + rx, y: cy };

  const scale = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
  return { x: cx + dx * scale, y: cy + dy * scale };
}
