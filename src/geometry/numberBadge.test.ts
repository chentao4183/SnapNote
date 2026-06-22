import { describe, expect, it } from "vitest";
import type { Annotation, NumberBadgeStyle, Rect } from "../types/annotation";
import type { SmartBadgePlacement } from "../types/numbering";
import {
  arrowBadgeBox,
  ellipseBadgeBox,
  keepRectInsideCrop,
  measureNumberBadge,
  rectBadgeBox,
  smartBadgeBox,
  textBadgeBox,
  BADGE_ANCHOR_GAP,
  ARROW_BADGE_END_GAP,
  ARROW_BADGE_LINE_GAP,
  BADGE_MIN_SIZE,
} from "./numberBadge";

const CROP: Rect = { x: 0, y: 0, width: 1000, height: 1000 };

// measureText that returns ~0.6 * fontSize per char, deterministic for tests.
const measure = (text: string, fontSize: number) => text.length * fontSize * 0.6;

function style(overrides: Partial<NumberBadgeStyle> = {}): NumberBadgeStyle {
  return { bgColor: "#1677ff", textColor: "#ffffff", shape: "square", fontSize: 13, ...overrides };
}

describe("measureNumberBadge", () => {
  it("squares produce equal width/height, both >= min size", () => {
    const box = measureNumberBadge(1, style(), measure);
    expect(box.width).toBe(box.height);
    expect(box.width).toBeGreaterThanOrEqual(BADGE_MIN_SIZE);
  });

  it("circle reuses square sizing", () => {
    const box = measureNumberBadge(42, style({ shape: "circle" }), measure);
    expect(box.width).toBe(box.height);
  });

  it("rounded allows width != height and respects both paddings", () => {
    const box = measureNumberBadge(999, style({ shape: "rounded", fontSize: 20 }), measure);
    expect(box.width).toBeGreaterThan(box.height);
    expect(box.height).toBeGreaterThanOrEqual(BADGE_MIN_SIZE);
  });

  it("grows for multi-digit numbers", () => {
    const single = measureNumberBadge(1, style(), measure);
    const triple = measureNumberBadge(100, style(), measure);
    expect(triple.width).toBeGreaterThan(single.width);
  });
});

describe("keepRectInsideCrop", () => {
  it("clamps normally within crop", () => {
    const out = keepRectInsideCrop(
      { x: -10, y: -10, width: 20, height: 20 },
      { x: 0, y: 0, width: 100, height: 100 },
    );
    expect(out).toEqual({ x: 0, y: 0, width: 20, height: 20 });
  });

  it("pins to crop origin when badge is larger than crop", () => {
    const out = keepRectInsideCrop(
      { x: 50, y: 50, width: 200, height: 200 },
      { x: 0, y: 0, width: 100, height: 100 },
    );
    expect(out.x).toBe(0);
    expect(out.y).toBe(0);
  });

  it("clamps right/bottom edges", () => {
    const out = keepRectInsideCrop(
      { x: 95, y: 95, width: 20, height: 20 },
      { x: 0, y: 0, width: 100, height: 100 },
    );
    // 100 - 20 = 80 is the max x
    expect(out.x).toBe(80);
    expect(out.y).toBe(80);
  });
});

describe("rectBadgeBox", () => {
  const rect: Rect = { x: 100, y: 100, width: 50, height: 50 };
  const box = { width: 20, height: 20 };

  it("top-left sits outside the corner", () => {
    expect(rectBadgeBox(rect, box, "top-left", CROP)).toEqual({ x: 80, y: 80, width: 20, height: 20 });
  });
  it("top-right sits outside the corner", () => {
    expect(rectBadgeBox(rect, box, "top-right", CROP)).toEqual({ x: 150, y: 80, width: 20, height: 20 });
  });
  it("bottom-left sits outside the corner", () => {
    expect(rectBadgeBox(rect, box, "bottom-left", CROP)).toEqual({ x: 80, y: 150, width: 20, height: 20 });
  });
  it("bottom-right sits outside the corner", () => {
    expect(rectBadgeBox(rect, box, "bottom-right", CROP)).toEqual({ x: 150, y: 150, width: 20, height: 20 });
  });
  it("center sits inside the rect", () => {
    const out = rectBadgeBox(rect, box, "center", CROP);
    expect(out.x).toBe(100 + (50 - 20) / 2);
    expect(out.y).toBe(100 + (50 - 20) / 2);
  });
});

describe("ellipseBadgeBox", () => {
  const bounds: Rect = { x: 100, y: 100, width: 50, height: 50 };
  const box = { width: 20, height: 20 };

  it("left sits outside the ellipse, vertically centered", () => {
    const out = ellipseBadgeBox(bounds, box, "left", CROP);
    expect(out.x).toBe(100 - BADGE_ANCHOR_GAP - 20);
    expect(out.y).toBe(125 - 10);
  });
  it("right sits outside the ellipse, vertically centered", () => {
    const out = ellipseBadgeBox(bounds, box, "right", CROP);
    expect(out.x).toBe(150 + BADGE_ANCHOR_GAP);
    expect(out.y).toBe(125 - 10);
  });
  it("top sits above the ellipse, horizontally centered", () => {
    const out = ellipseBadgeBox(bounds, box, "top", CROP);
    expect(out.x).toBe(125 - 10);
    expect(out.y).toBe(100 - BADGE_ANCHOR_GAP - 20);
  });
  it("bottom sits below the ellipse, horizontally centered", () => {
    const out = ellipseBadgeBox(bounds, box, "bottom", CROP);
    expect(out.x).toBe(125 - 10);
    expect(out.y).toBe(150 + BADGE_ANCHOR_GAP);
  });
  it("center sits at the ellipse center", () => {
    const out = ellipseBadgeBox(bounds, box, "center", CROP);
    expect(out.x).toBe(125 - 10);
    expect(out.y).toBe(125 - 10);
  });
});

describe("arrowBadgeBox", () => {
  const box = { width: 20, height: 20 };
  const lineOffset = box.height / 2 + ARROW_BADGE_LINE_GAP;

  it("start sits above a horizontal arrow start point", () => {
    const out = arrowBadgeBox(
      { startX: 10, startY: 100, endX: 100, endY: 100 },
      box,
      "start",
      CROP,
    );
    expect(out.x).toBe(10 - 10);
    expect(out.y).toBe(100 - lineOffset - 10);
  });
  it("middle sits above a horizontal arrow midpoint", () => {
    const out = arrowBadgeBox(
      { startX: 0, startY: 100, endX: 100, endY: 100 },
      box,
      "middle",
      CROP,
    );
    expect(out.x).toBe(50 - 10);
    expect(out.y).toBe(100 - lineOffset - 10);
  });
  it("end is inset by half badge width plus gap, then placed above the line", () => {
    const out = arrowBadgeBox(
      { startX: 0, startY: 100, endX: 100, endY: 100 },
      box,
      "end",
      CROP,
    );
    expect(out.x).toBe(100 - box.width - ARROW_BADGE_END_GAP);
    expect(out.y).toBe(100 - lineOffset - 10);
  });
  it("near-vertical arrows place badges on the left side", () => {
    const out = arrowBadgeBox(
      { startX: 100, startY: 0, endX: 100, endY: 100 },
      box,
      "middle",
      CROP,
    );
    expect(out.x).toBe(100 - lineOffset - 10);
    expect(out.y).toBe(50 - 10);
  });
  it("falls back to end point when start is missing", () => {
    const out = arrowBadgeBox({ endX: 30, endY: 40 }, box, "start", CROP);
    expect(out.x).toBe(30 - 10);
    expect(out.y).toBe(40 - lineOffset - 10);
  });
});

describe("textBadgeBox", () => {
  const textBox = { x: 200, y: 100, width: 60, height: 20 };
  const box = { width: 18, height: 18 };

  it("left places badge just outside the left text edge", () => {
    const out = textBadgeBox(textBox, box, "left", CROP);
    expect(out.x).toBe(200 - BADGE_ANCHOR_GAP - 18);
    expect(out.y).toBe(100 + (20 - 18) / 2);
  });
  it("right places badge just outside the right text edge", () => {
    const out = textBadgeBox(textBox, box, "right", CROP);
    expect(out.x).toBe(200 + 60 + BADGE_ANCHOR_GAP);
  });
});

describe("smartBadgeBox", () => {
  const labelBox = { x: 200, y: 100, width: 60, height: 20 };
  const box = { width: 18, height: 18 };

  function annotation(overrides: Partial<Annotation>): Annotation {
    return {
      id: "s1",
      type: "smart",
      rect: { x: 100, y: 100, width: 50, height: 50 },
      arrow: { startX: 110, startY: 110, endX: 200, endY: 110 },
      style: {
        borderColor: "#ff4757",
        borderWidth: 3,
        bgColor: "#ff4757",
        textColor: "#ffffff",
        fontSize: 13,
      },
      ...overrides,
    };
  }

  it("anchor=target with rect shape uses rect placement", () => {
    const placement: SmartBadgePlacement = {
      anchor: "target",
      targetRectPosition: "top-left",
      targetEllipsePosition: "left",
      arrowPosition: "end",
      labelPosition: "left",
    };
    const out = smartBadgeBox(annotation({ shape: "rect" }), placement, labelBox, box, CROP);
    expect(out).toEqual(rectBadgeBox({ x: 100, y: 100, width: 50, height: 50 }, box, "top-left", CROP));
  });

  it("anchor=target with ellipse shape uses ellipse placement", () => {
    const placement: SmartBadgePlacement = {
      anchor: "target",
      targetRectPosition: "top-left",
      targetEllipsePosition: "right",
      arrowPosition: "end",
      labelPosition: "left",
    };
    const out = smartBadgeBox(annotation({ shape: "ellipse" }), placement, labelBox, box, CROP);
    expect(out).toEqual(ellipseBadgeBox({ x: 100, y: 100, width: 50, height: 50 }, box, "right", CROP));
  });

  it("anchor=arrow delegates to arrowBadgeBox", () => {
    const placement: SmartBadgePlacement = {
      anchor: "arrow",
      targetRectPosition: "top-left",
      targetEllipsePosition: "left",
      arrowPosition: "middle",
      labelPosition: "left",
    };
    const ann = annotation({});
    const out = smartBadgeBox(ann, placement, labelBox, box, CROP);
    expect(out).toEqual(arrowBadgeBox(ann.arrow!, box, "middle", CROP));
  });

  it("anchor=label delegates to textBadgeBox with configured side", () => {
    const placement: SmartBadgePlacement = {
      anchor: "label",
      targetRectPosition: "top-left",
      targetEllipsePosition: "left",
      arrowPosition: "end",
      labelPosition: "right",
    };
    const out = smartBadgeBox(annotation({}), placement, labelBox, box, CROP);
    expect(out).toEqual(textBadgeBox(labelBox, box, "right", CROP));
  });

  it("missing rect on anchor=target falls back to label-left", () => {
    const placement: SmartBadgePlacement = {
      anchor: "target",
      targetRectPosition: "top-left",
      targetEllipsePosition: "left",
      arrowPosition: "end",
      labelPosition: "left",
    };
    const out = smartBadgeBox(annotation({ rect: undefined }), placement, labelBox, box, CROP);
    expect(out).toEqual(textBadgeBox(labelBox, box, "left", CROP));
  });

  it("missing arrow on anchor=arrow falls back to label-left", () => {
    const placement: SmartBadgePlacement = {
      anchor: "arrow",
      targetRectPosition: "top-left",
      targetEllipsePosition: "left",
      arrowPosition: "middle",
      labelPosition: "left",
    };
    const out = smartBadgeBox(annotation({ arrow: undefined }), placement, labelBox, box, CROP);
    expect(out).toEqual(textBadgeBox(labelBox, box, "left", CROP));
  });
});
