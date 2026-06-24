import { describe, it, expect } from "vitest";
import {
  labelAnchorFromBoxPosition,
  labelBoxOffset,
  labelBoxPosition,
  labelSide,
  labelVerticalAnchor,
} from "./labelBox";
import { directionToCorner } from "./corners";

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
    expect(labelBoxPosition({ x: 120, y: 100 }, "left", 60, 20, "bottom")).toEqual({ boxX: 60, boxY: 80 });
  });

  it("uses the right side when the anchor is right of the shape center", () => {
    expect(labelSide({ x: 170, y: 100 }, rect)).toBe("right");
    expect(labelBoxPosition({ x: 170, y: 100 }, "right", 60, 20, "bottom")).toEqual({ boxX: 170, boxY: 80 });
  });

  it("anchors to the top edge when the label is below the target", () => {
    const anchor = { x: 80, y: 170 };
    expect(labelVerticalAnchor(anchor, rect)).toBe("top");
    expect(labelBoxPosition(anchor, "left", 60, 20, "top")).toEqual({ boxX: 20, boxY: 170 });
  });

  it("inverts a label box position back to the fixed arrow anchor", () => {
    expect(labelAnchorFromBoxPosition({ x: 20, y: 170 }, "left", "top", 60, 20)).toEqual({ x: 80, y: 170 });
    expect(labelAnchorFromBoxPosition({ x: 20, y: 150 }, "left", "bottom", 60, 20)).toEqual({ x: 80, y: 170 });
  });
});

/**
 * directionToCorner maps a drag direction to the target-box corner in the same
 * quadrant. It is what lets the free-arrow (no-target) mode reuse labelBoxOffset
 * so the label sits the same way it does in target-box mode.
 */
describe("directionToCorner", () => {
  it("maps a start left+above the anchor to 'tl'", () => {
    expect(directionToCorner({ x: 100, y: 100 }, { x: 300, y: 300 })).toBe("tl");
  });

  it("maps a start right+above the anchor to 'tr'", () => {
    expect(directionToCorner({ x: 300, y: 100 }, { x: 100, y: 300 })).toBe("tr");
  });

  it("maps a start left+below the anchor to 'bl'", () => {
    expect(directionToCorner({ x: 100, y: 300 }, { x: 300, y: 100 })).toBe("bl");
  });

  it("maps a start right+below the anchor to 'br'", () => {
    expect(directionToCorner({ x: 300, y: 300 }, { x: 100, y: 100 })).toBe("br");
  });
});

/**
 * No-target mode must produce the SAME corner-anchored layout as target-box
 * mode: directionToCorner + labelBoxOffset == a direct labelBoxOffset for the
 * matching corner. This is the invariant that keeps the two modes visually
 * identical regardless of whether a target box exists.
 */
describe("no-target label placement matches target-box placement", () => {
  const W = 80;
  const H = 24;
  const tip = { x: 300, y: 200 };

  it("produces the tl layout when the drag start is left+above the tip", () => {
    const corner = directionToCorner({ x: 100, y: 100 }, tip);
    expect(corner).toBe("tl");
    const off = labelBoxOffset(corner, W, H);
    // tip lands on the label's bottom-right corner
    expect({ boxX: tip.x + off.dx, boxY: tip.y + off.dy }).toEqual({ boxX: 300 - W, boxY: 200 - H });
  });

  it("produces the br layout when the drag start is right+below the tip", () => {
    const corner = directionToCorner({ x: 500, y: 400 }, tip);
    expect(corner).toBe("br");
    const off = labelBoxOffset(corner, W, H);
    // tip lands on the label's top-left corner
    expect({ boxX: tip.x + off.dx, boxY: tip.y + off.dy }).toEqual({ boxX: 300, boxY: 200 });
  });
});
