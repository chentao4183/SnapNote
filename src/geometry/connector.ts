import type { Rect, ShapeKind } from "../types/annotation";
import type { Point } from "./corners";
import { ellipseBoundaryPoint } from "./ellipse";

export interface ConnectorSegment {
  start: Point;
  end: Point;
}

export function closestSegmentBetweenRects(from: Rect, to: Rect): ConnectorSegment {
  const [startX, endX] = closestOnIntervals(from.x, from.x + from.width, to.x, to.x + to.width);
  const [startY, endY] = closestOnIntervals(from.y, from.y + from.height, to.y, to.y + to.height);
  return {
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
  };
}

export function connectorBetweenShapeAndLabel(shape: ShapeKind, targetBounds: Rect, labelBounds: Rect): ConnectorSegment {
  const rectSegment = closestSegmentBetweenRects(targetBounds, labelBounds);
  return {
    start: shape === "ellipse" ? ellipseBoundaryPoint(targetBounds, rectSegment.end) : rectSegment.start,
    end: rectSegment.end,
  };
}

function closestOnIntervals(a0: number, a1: number, b0: number, b1: number): [number, number] {
  if (a1 < b0) return [a1, b0];
  if (b1 < a0) return [a0, b1];

  const overlapStart = Math.max(a0, b0);
  const overlapEnd = Math.min(a1, b1);
  const mid = (overlapStart + overlapEnd) / 2;
  return [mid, mid];
}
