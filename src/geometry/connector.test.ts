import { describe, expect, it } from "vitest";
import { closestSegmentBetweenRects, connectorBetweenShapeAndLabel } from "./connector";

describe("closestSegmentBetweenRects", () => {
  it("connects bottom-left target corner to top-right label corner for left-lower label", () => {
    const target = { x: 180, y: 80, width: 90, height: 55 };
    const label = { x: 30, y: 190, width: 50, height: 24 };

    expect(closestSegmentBetweenRects(target, label)).toEqual({
      start: { x: 180, y: 135 },
      end: { x: 80, y: 190 },
    });
  });

  it("connects facing side midpoints when rectangles overlap on one axis", () => {
    const target = { x: 100, y: 100, width: 80, height: 60 };
    const label = { x: 20, y: 120, width: 40, height: 30 };

    expect(closestSegmentBetweenRects(target, label)).toEqual({
      start: { x: 100, y: 135 },
      end: { x: 60, y: 135 },
    });
  });
});

describe("connectorBetweenShapeAndLabel", () => {
  it("uses the ellipse boundary for ellipse targets", () => {
    const target = { x: 100, y: 100, width: 100, height: 80 };
    const label = { x: 250, y: 130, width: 50, height: 20 };
    const segment = connectorBetweenShapeAndLabel("ellipse", target, label);

    expect(segment.end).toEqual({ x: 250, y: 140 });
    expect(segment.start.x).toBeCloseTo(200);
    expect(segment.start.y).toBeCloseTo(140);
  });
});
