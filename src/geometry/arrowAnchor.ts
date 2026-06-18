import type { Rect, ShapeKind } from "../types/annotation";
import type { Point } from "./corners";
import { ellipseBoundaryPoint } from "./ellipse";
import { nearestRectEdgePoint } from "./rectEdge";

export function smartArrowStart(shape: ShapeKind, bounds: Rect, mouse: Point): Point {
  return shape === "ellipse" ? ellipseBoundaryPoint(bounds, mouse) : nearestRectEdgePoint(bounds, mouse);
}
