import {
  freeArrowLabelAnchor,
  freeArrowLabelBox,
  labelAnchorFromBoxPosition,
  labelBoxOffset,
  labelBoxPosition as positionLabelBox,
  labelSide,
  labelVerticalAnchor,
} from "./labelBox";
import type { Annotation } from "../types/annotation";

/**
 * Shared smart/text label box math.
 *
 * Extracted so both the TextLabelShape renderer and the number badge
 * placement use the SAME path to compute the rendered visual label box,
 * keeping badge anchor math consistent with where the label is actually drawn.
 */

export interface LabelBoxRect {
  boxX: number;
  boxY: number;
  width: number;
  height: number;
}

export function resolveLabelBox(
  a: Annotation,
  labelX: number,
  labelY: number,
  boxWidth: number,
  boxHeight: number,
): { boxX: number; boxY: number } {
  if (a.rect) {
    const anchor = { x: labelX, y: labelY };
    return positionLabelBox(anchor, labelSide(anchor, a.rect), boxWidth, boxHeight, labelVerticalAnchor(anchor, a.rect));
  }
  if (a.arrow?.startCorner) {
    const off = labelBoxOffset(a.arrow.startCorner, boxWidth, boxHeight);
    return { boxX: labelX + off.dx, boxY: labelY + off.dy };
  }
  if (a.arrow && a.arrow.startX !== undefined && a.arrow.startY !== undefined) {
    // Free-arrow mode (shape = "none"): center the label on the arrow line so
    // the tip meets the label edge instead of poking into its top-left corner.
    return freeArrowLabelBox({ x: a.arrow.startX, y: a.arrow.startY }, { x: labelX, y: labelY }, boxWidth, boxHeight);
  }
  return { boxX: labelX, boxY: labelY };
}

export function resolveLabelAnchor(
  a: Annotation,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number,
): { labelX: number; labelY: number } {
  if (a.rect) {
    const oldAnchor = { x: a.arrow?.endX ?? boxX, y: a.arrow?.endY ?? boxY };
    const anchor = labelAnchorFromBoxPosition(
      { x: boxX, y: boxY },
      labelSide(oldAnchor, a.rect),
      labelVerticalAnchor(oldAnchor, a.rect),
      boxWidth,
      boxHeight,
    );
    return { labelX: anchor.x, labelY: anchor.y };
  }
  if (a.arrow?.startCorner) {
    const off = labelBoxOffset(a.arrow.startCorner, boxWidth, boxHeight);
    return { labelX: boxX - off.dx, labelY: boxY - off.dy };
  }
  if (a.arrow && a.arrow.startX !== undefined && a.arrow.startY !== undefined) {
    const anchor = freeArrowLabelAnchor({ x: a.arrow.startX, y: a.arrow.startY }, { x: boxX, y: boxY, width: boxWidth, height: boxHeight });
    return { labelX: anchor.x, labelY: anchor.y };
  }
  return { labelX: boxX, labelY: boxY };
}
