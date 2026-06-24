import { describe, it, expect } from "vitest";
import {
  directionalLabelAnchor,
  directionalLabelBox,
  labelDirection,
} from "./directionalLabelBox";

/**
 * The "nearest edge midpoint" rule: the arrow tip always lands on the midpoint
 * of the label edge nearest the arrow start. The dominant axis of the drag
 * (start -> tip) decides which edge, and the rule is independent of whether a
 * target box exists — so target-box and no-target modes render identically.
 *
 *   horizontal arrow (|dx| >= |dy|): tip on the LEFT/RIGHT edge midpoint,
 *     label vertically centered on the arrow line.
 *   vertical arrow   (|dy| >  |dx|): tip on the TOP/BOTTOM edge midpoint,
 *     label horizontally centered on the arrow line.
 */
describe("labelDirection", () => {
  it("classifies a rightward drag as horizontal/right", () => {
    expect(labelDirection({ x: 0, y: 0 }, { x: 100, y: 0 })).toEqual({ axis: "horizontal", side: "right" });
  });

  it("classifies a leftward drag as horizontal/left", () => {
    expect(labelDirection({ x: 100, y: 0 }, { x: 0, y: 0 })).toEqual({ axis: "horizontal", side: "left" });
  });

  it("classifies a downward drag as vertical/bottom", () => {
    expect(labelDirection({ x: 0, y: 0 }, { x: 0, y: 100 })).toEqual({ axis: "vertical", side: "bottom" });
  });

  it("classifies an upward drag as vertical/top", () => {
    expect(labelDirection({ x: 0, y: 100 }, { x: 0, y: 0 })).toEqual({ axis: "vertical", side: "top" });
  });

  it("breaks an exact diagonal toward horizontal (|dx| >= |dy|)", () => {
    expect(labelDirection({ x: 0, y: 0 }, { x: 50, y: 50 })).toEqual({ axis: "horizontal", side: "right" });
  });
});

describe("directionalLabelBox", () => {
  const W = 80;
  const H = 24;

  it("places the label to the right of the start, tip on its LEFT edge midpoint", () => {
    const tip = { x: 300, y: 200 };
    const box = directionalLabelBox({ x: 100, y: 200 }, tip, W, H);
    // tip.x = boxX, tip.y = boxY + H/2
    expect(box).toEqual({ boxX: 300, boxY: 200 - H / 2 });
    expect(box.boxX).toBe(tip.x);
    expect(box.boxY + H / 2).toBe(tip.y);
  });

  it("places the label to the left of the start, tip on its RIGHT edge midpoint", () => {
    const tip = { x: 100, y: 200 };
    const box = directionalLabelBox({ x: 300, y: 200 }, tip, W, H);
    // tip.x = boxX + W, tip.y = boxY + H/2
    expect(box).toEqual({ boxX: 100 - W, boxY: 200 - H / 2 });
    expect(box.boxX + W).toBe(tip.x);
    expect(box.boxY + H / 2).toBe(tip.y);
  });

  it("places the label below the start, tip on its TOP edge midpoint", () => {
    const tip = { x: 200, y: 300 };
    const box = directionalLabelBox({ x: 200, y: 100 }, tip, W, H);
    // tip.x = boxX + W/2, tip.y = boxY
    expect(box).toEqual({ boxX: 200 - W / 2, boxY: 300 });
    expect(box.boxX + W / 2).toBe(tip.x);
    expect(box.boxY).toBe(tip.y);
  });

  it("places the label above the start, tip on its BOTTOM edge midpoint", () => {
    const tip = { x: 200, y: 100 };
    const box = directionalLabelBox({ x: 200, y: 300 }, tip, W, H);
    // tip.x = boxX + W/2, tip.y = boxY + H
    expect(box).toEqual({ boxX: 200 - W / 2, boxY: 100 - H });
    expect(box.boxX + W / 2).toBe(tip.x);
    expect(box.boxY + H).toBe(tip.y);
  });
});

/**
 * directionalLabelAnchor must be the inverse of directionalLabelBox so that
 * drag-to-edit round-trips: placing a box and recovering the tip yields the
 * original tip.
 */
describe("directionalLabelAnchor inverts directionalLabelBox", () => {
  const W = 80;
  const H = 24;
  const cases = [
    { name: "rightward drag", start: { x: 100, y: 200 }, tip: { x: 300, y: 200 } },
    { name: "leftward drag", start: { x: 300, y: 200 }, tip: { x: 100, y: 200 } },
    { name: "downward drag", start: { x: 200, y: 100 }, tip: { x: 200, y: 300 } },
    { name: "upward drag", start: { x: 200, y: 300 }, tip: { x: 200, y: 100 } },
    { name: "diagonal drag (horizontal)", start: { x: 100, y: 100 }, tip: { x: 250, y: 200 } },
  ];

  for (const c of cases) {
    it(`round-trips a ${c.name}`, () => {
      const box = directionalLabelBox(c.start, c.tip, W, H);
      const recovered = directionalLabelAnchor(c.start, { x: box.boxX, y: box.boxY, width: W, height: H });
      expect(recovered.x).toBeCloseTo(c.tip.x, 5);
      expect(recovered.y).toBeCloseTo(c.tip.y, 5);
    });
  }
});
