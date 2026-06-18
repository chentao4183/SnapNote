import { describe, expect, it } from "vitest";
import { ellipseBoundaryPoint } from "./ellipse";

describe("ellipseBoundaryPoint", () => {
  const ellipse = { x: 100, y: 100, width: 200, height: 100 };

  it("returns the right boundary for a center point", () => {
    expect(ellipseBoundaryPoint(ellipse, { x: 200, y: 150 })).toEqual({ x: 300, y: 150 });
  });

  it("returns cardinal boundary points", () => {
    expect(ellipseBoundaryPoint(ellipse, { x: 400, y: 150 })).toEqual({ x: 300, y: 150 });
    expect(ellipseBoundaryPoint(ellipse, { x: 200, y: 0 })).toEqual({ x: 200, y: 100 });
  });

  it("returns a point on the ellipse for diagonal directions", () => {
    const p = ellipseBoundaryPoint(ellipse, { x: 300, y: 250 });
    const cx = 200;
    const cy = 150;
    const rx = 100;
    const ry = 50;
    expect(((p.x - cx) ** 2) / (rx ** 2) + ((p.y - cy) ** 2) / (ry ** 2)).toBeCloseTo(1);
  });
});
