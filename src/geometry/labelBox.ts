import type { Corner } from "../types/annotation";
import type { Rect } from "../types/annotation";

export interface Offset {
  dx: number;
  dy: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Where the label box sits relative to its anchor point (endX, endY), given the
 * rect corner the arrow starts from. Implements spec §5.3: the label extends
 * AWAY from the rectangle, so the anchor is placed on the label corner that
 * faces the arrow tip.
 *
 *   startCorner | label corner at anchor | offset (dx, dy)
 *   ------------+------------------------+----------------
 *   tl          | bottom-right           | (-W, -H)
 *   tr          | bottom-left            | ( 0, -H)
 *   bl          | top-right              | (-W,  0)
 *   br          | top-left               | ( 0,  0)
 *
 * Box width/height are passed in because the label size depends on the measured
 * text; geometry stays pure and testable.
 */
export function labelBoxOffset(corner: Corner, boxWidth: number, boxHeight: number): Offset {
  switch (corner) {
    case "tl":
      return { dx: -boxWidth, dy: -boxHeight };
    case "tr":
      return { dx: 0, dy: -boxHeight };
    case "bl":
      return { dx: -boxWidth, dy: 0 };
    case "br":
      return { dx: 0, dy: 0 };
  }
}

/**
 * Label placement for the free-arrow smart mode (shape = "none").
 *
 * The arrow has no target box, so the label is anchored on the arrow tip
 * (endX, endY). To stay flush with the arrow instead of poking into the box's
 * top-left corner, the label box is centered on the arrow line on its dominant
 * axis, with the edge nearest the arrow start meeting the tip:
 *
 *   - horizontal arrow (|dx| >= |dy|): box sits left/right of the tip, its
 *     vertical center on the line (boxY = tip.y - boxH/2).
 *   - vertical arrow (|dy| > |dx|): box sits above/below the tip, its
 *     horizontal center on the line (boxX = tip.x - boxW/2).
 *
 * Axis classification uses the box CENTER vs the arrow start so the placement
 * and its inverse (freeArrowLabelAnchor) agree regardless of which corner the
 * box was anchored from. "left/right" / "above/below" follows the arrow's
 * travel direction so the box always extends away from where the drag started.
 */
export function freeArrowLabelBox(
  start: Point,
  tip: Point,
  boxWidth: number,
  boxHeight: number,
): { boxX: number; boxY: number } {
  const dx = tip.x - start.x;
  const dy = tip.y - start.y;

  // Degenerate: zero-length drag keeps the legacy anchor (box top-left = tip).
  if (dx === 0 && dy === 0) {
    return { boxX: tip.x, boxY: tip.y };
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Dominant horizontal: box beside the tip, vertically centered on the line.
    const boxX = dx >= 0 ? tip.x : tip.x - boxWidth;
    const boxY = tip.y - boxHeight / 2;
    return { boxX, boxY };
  }

  // Dominant vertical: box above/below the tip, horizontally centered on the line.
  const boxX = tip.x - boxWidth / 2;
  const boxY = dy >= 0 ? tip.y : tip.y - boxHeight;
  return { boxX, boxY };
}

/**
 * Inverse of freeArrowLabelBox: recover the arrow tip (label anchor) from the
 * rendered box position. Keeps drag-to-edit consistent with placement.
 *
 * Classifies the axis from the box CENTER vs the arrow start (not the box
 * top-left), so it matches freeArrowLabelBox even when the box overhangs the
 * tip on a short vertical arrow.
 */
export function freeArrowLabelAnchor(
  start: Point,
  box: { x: number; y: number; width: number; height: number },
): { x: number; y: number } {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = cx - start.x;
  const dy = cy - start.y;

  if (dx === 0 && dy === 0) {
    return { x: box.x, y: box.y };
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal placement: tip is on the box edge facing the arrow start.
    return {
      x: dx >= 0 ? box.x : box.x + box.width,
      y: cy,
    };
  }

  // Vertical placement: tip is on the box edge facing the arrow start.
  return {
    x: cx,
    y: dy >= 0 ? box.y : box.y + box.height,
  };
}

export type LabelSide = "left" | "right";
export type LabelVerticalAnchor = "top" | "middle" | "bottom";

export function labelSide(anchor: { x: number; y: number }, rect: Rect): LabelSide {
  return anchor.x < rect.x + rect.width / 2 ? "left" : "right";
}

export function labelVerticalAnchor(anchor: { x: number; y: number }, rect: Rect): LabelVerticalAnchor {
  if (anchor.y < rect.y) return "bottom";
  if (anchor.y > rect.y + rect.height) return "top";
  return "middle";
}

export function labelBoxPosition(
  anchor: { x: number; y: number },
  side: LabelSide,
  boxWidth: number,
  boxHeight: number,
  vertical: LabelVerticalAnchor = "bottom",
): { boxX: number; boxY: number } {
  const boxY =
    vertical === "top" ? anchor.y : vertical === "middle" ? anchor.y - boxHeight / 2 : anchor.y - boxHeight;

  return {
    boxX: side === "left" ? anchor.x - boxWidth : anchor.x,
    boxY,
  };
}

export function labelAnchorFromBoxPosition(
  box: { x: number; y: number },
  side: LabelSide,
  vertical: LabelVerticalAnchor,
  boxWidth: number,
  boxHeight: number,
): { x: number; y: number } {
  return {
    x: side === "left" ? box.x + boxWidth : box.x,
    y: vertical === "top" ? box.y : vertical === "middle" ? box.y + boxHeight / 2 : box.y + boxHeight,
  };
}
