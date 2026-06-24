import { describe, it, expect } from "vitest";
import {
  freeArrowLabelAnchor,
  freeArrowLabelBox,
  labelAnchorFromBoxPosition,
  labelBoxOffset,
  labelBoxPosition,
  labelSide,
  labelVerticalAnchor,
} from "./labelBox";

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
 * Free-arrow label placement (shape = "none"): the label box must be centered
 * on the arrow line, with the edge nearest the drag start meeting the arrow tip
 * — never poking into the box's top-left corner.
 */
describe("freeArrowLabelBox", () => {
  const W = 80;
  const H = 24;

  it("places the box right of the tip, vertically centered, for a rightward arrow", () => {
    const box = freeArrowLabelBox({ x: 100, y: 200 }, { x: 300, y: 200 }, W, H);
    // box left edge at tip, vertical center on the line (tip.y - H/2).
    expect(box).toEqual({ boxX: 300, boxY: 200 - H / 2 });
  });

  it("places the box left of the tip for a leftward arrow", () => {
    const box = freeArrowLabelBox({ x: 300, y: 200 }, { x: 100, y: 200 }, W, H);
    expect(box).toEqual({ boxX: 100 - W, boxY: 200 - H / 2 });
  });

  it("places the box below the tip, horizontally centered, for a downward arrow", () => {
    const box = freeArrowLabelBox({ x: 200, y: 100 }, { x: 200, y: 300 }, W, H);
    expect(box).toEqual({ boxX: 200 - W / 2, boxY: 300 });
  });

  it("places the box above the tip for an upward arrow", () => {
    const box = freeArrowLabelBox({ x: 200, y: 300 }, { x: 200, y: 100 }, W, H);
    expect(box).toEqual({ boxX: 200 - W / 2, boxY: 100 - H });
  });

  it("falls back to box top-left = tip for a zero-length drag", () => {
    expect(freeArrowLabelBox({ x: 50, y: 50 }, { x: 50, y: 50 }, W, H)).toEqual({ boxX: 50, boxY: 50 });
  });
});

describe("freeArrowLabelAnchor (inverse of freeArrowLabelBox)", () => {
  const W = 80;
  const H = 24;

  it("recovers the tip from a rightward-arrow box", () => {
    const start = { x: 100, y: 200 };
    const tip = { x: 300, y: 200 };
    const box = freeArrowLabelBox(start, tip, W, H);
    expect(freeArrowLabelAnchor(start, { x: box.boxX, y: box.boxY, width: W, height: H })).toEqual(tip);
  });

  it("recovers the tip from a leftward-arrow box", () => {
    const start = { x: 300, y: 200 };
    const tip = { x: 100, y: 200 };
    const box = freeArrowLabelBox(start, tip, W, H);
    expect(freeArrowLabelAnchor(start, { x: box.boxX, y: box.boxY, width: W, height: H })).toEqual(tip);
  });

  it("recovers the tip from a downward-arrow box", () => {
    const start = { x: 200, y: 100 };
    const tip = { x: 200, y: 300 };
    const box = freeArrowLabelBox(start, tip, W, H);
    expect(freeArrowLabelAnchor(start, { x: box.boxX, y: box.boxY, width: W, height: H })).toEqual(tip);
  });

  it("recovers the tip from an upward-arrow box", () => {
    const start = { x: 200, y: 300 };
    const tip = { x: 200, y: 100 };
    const box = freeArrowLabelBox(start, tip, W, H);
    expect(freeArrowLabelAnchor(start, { x: box.boxX, y: box.boxY, width: W, height: H })).toEqual(tip);
  });

  it("stays on the vertical axis for a short downward arrow (box-center classification)", () => {
    // Short drag: |dy| (40) is large vs box height (24) but box width (80)
    // overhangs the tip by W/2 on each side. Center-based classification must
    // still read this as vertical and recover the exact tip.
    const start = { x: 200, y: 100 };
    const tip = { x: 200, y: 140 };
    const box = freeArrowLabelBox(start, tip, W, H);
    expect(box).toEqual({ boxX: 200 - W / 2, boxY: 140 });
    expect(freeArrowLabelAnchor(start, { x: box.boxX, y: box.boxY, width: W, height: H })).toEqual(tip);
  });
});
