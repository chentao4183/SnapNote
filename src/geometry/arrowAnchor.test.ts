import { describe, expect, it } from "vitest";
import { smartArrowStart } from "./arrowAnchor";

describe("smartArrowStart", () => {
  const rect = { x: 100, y: 100, width: 100, height: 80 };
  const center = { x: 150, y: 140 };

  it("uses the center-ray intersection for rect shapes", () => {
    // ray from center (150,140) toward (120,10) exits the top edge at (140.77,100)
    expect(smartArrowStart("rect", rect, { x: 120, y: 10 })).toEqual({ x: 140.76923076923077, y: 100 });
  });

  it("rect arrow start stays collinear with the center and the point", () => {
    const start = smartArrowStart("rect", rect, { x: 120, y: 10 });
    const cross = (start.x - center.x) * (10 - center.y) - (start.y - center.y) * (120 - center.x);
    expect(Math.abs(cross)).toBeLessThan(1e-6);
  });

  it("uses the ellipse boundary point for ellipse shapes", () => {
    expect(smartArrowStart("ellipse", rect, { x: 200, y: 140 })).toEqual({ x: 200, y: 140 });
  });
});
