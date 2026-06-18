import { describe, expect, it } from "vitest";
import { smartArrowStart } from "./arrowAnchor";

describe("smartArrowStart", () => {
  const rect = { x: 100, y: 100, width: 100, height: 80 };

  it("uses the nearest rectangle boundary point", () => {
    expect(smartArrowStart("rect", rect, { x: 120, y: 10 })).toEqual({ x: 120, y: 100 });
  });

  it("uses the ellipse boundary point for ellipse shapes", () => {
    expect(smartArrowStart("ellipse", rect, { x: 200, y: 140 })).toEqual({ x: 200, y: 140 });
  });
});
