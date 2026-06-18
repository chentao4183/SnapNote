import { describe, it, expect } from "vitest";
import { labelBoxOffset, labelBoxPosition, labelSide } from "./labelBox";

/**
 * Locks the spec §5.3 rule: the label's anchor corner is decided by the rect
 * corner the arrow starts from, so the label always extends AWAY from the
 * rectangle (toward where the user clicked).
 *
 *   anchor (endX,endY) sits at the label corner marked "*":
 *
 *   startCorner=tl → anchor at label's bottom-right  → box at (−W, −H)
 *   startCorner=tr → anchor at label's bottom-left   → box at ( 0, −H)
 *   startCorner=bl → anchor at label's top-right     → box at (−W,  0)
 *   startCorner=br → anchor at label's top-left      → box at ( 0,  0)
 */
describe("labelBoxOffset", () => {
  const W = 80;
  const H = 24;

  it("anchors the bottom-right corner for a tl arrow (label extends up-left)", () => {
    expect(labelBoxOffset("tl", W, H)).toEqual({ dx: -W, dy: -H });
  });

  it("anchors the bottom-left corner for a tr arrow (label extends up-right)", () => {
    expect(labelBoxOffset("tr", W, H)).toEqual({ dx: 0, dy: -H });
  });

  it("anchors the top-right corner for a bl arrow (label extends down-left)", () => {
    expect(labelBoxOffset("bl", W, H)).toEqual({ dx: -W, dy: 0 });
  });

  it("anchors the top-left corner for a br arrow (label extends down-right)", () => {
    expect(labelBoxOffset("br", W, H)).toEqual({ dx: 0, dy: 0 });
  });
});

describe("label side positioning", () => {
  const rect = { x: 100, y: 100, width: 80, height: 40 };

  it("uses the left side when the anchor is left of the shape center", () => {
    expect(labelSide({ x: 120, y: 100 }, rect)).toBe("left");
    expect(labelBoxPosition({ x: 120, y: 100 }, "left", 60, 20)).toEqual({ boxX: 60, boxY: 78 });
  });

  it("uses the right side when the anchor is right of the shape center", () => {
    expect(labelSide({ x: 170, y: 100 }, rect)).toBe("right");
    expect(labelBoxPosition({ x: 170, y: 100 }, "right", 60, 20)).toEqual({ boxX: 170, boxY: 78 });
  });
});
