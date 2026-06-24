import { describe, expect, it } from "vitest";
import { nearestRectEdgePoint } from "./rectEdge";

describe("nearestRectEdgePoint (center-ray intersection)", () => {
  const rect = { x: 100, y: 100, width: 200, height: 80 };
  const cx = 200;
  const cy = 140;

  it("intersects the center ray on the border, so start->point is collinear with center", () => {
    const p = { x: 180, y: 40 };
    const start = nearestRectEdgePoint(rect, p);
    expect(start).toEqual({ x: 192, y: 100 });
    // center -> start -> point all on one line
    expect(collinear({ x: cx, y: cy }, start, p)).toBe(true);
  });

  it("hits the right edge for a point to the right of the rect", () => {
    const p = { x: 340, y: 150 };
    const start = nearestRectEdgePoint(rect, p);
    expect(start.x).toBeCloseTo(300, 5);
    expect(collinear({ x: cx, y: cy }, start, p)).toBe(true);
  });

  it("hits the corner exactly when the center ray points at a corner", () => {
    // ray center (200,140) -> corner (300,100) extended to (500,20)
    const p = { x: 500, y: 20 };
    const start = nearestRectEdgePoint(rect, p);
    expect(start).toEqual({ x: 300, y: 100 });
  });

  it("works for an inside point too (exits the same edge)", () => {
    const p = { x: 200, y: 110 };
    const start = nearestRectEdgePoint(rect, p);
    expect(start).toEqual({ x: 200, y: 100 });
    expect(collinear({ x: cx, y: cy }, start, p)).toBe(true);
  });

  it("matches ellipse semantics: same center ray => same collinearity", () => {
    const p = { x: 50, y: 40 };
    const start = nearestRectEdgePoint(rect, p);
    expect(collinear({ x: cx, y: cy }, start, p)).toBe(true);
  });
});

/** Three points are collinear when the cross product of (b-a) x (c-a) is ~0. */
function collinear(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): boolean {
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return Math.abs(cross) < 1e-6;
}
