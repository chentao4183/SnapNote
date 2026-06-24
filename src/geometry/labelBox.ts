import type { Corner } from "../types/annotation";
import type { Rect } from "../types/annotation";

export interface Offset {
  dx: number;
  dy: number;
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
