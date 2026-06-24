import type { Rect } from "../types/annotation";

/**
 * Direction-driven label placement (the "nearest edge midpoint" rule).
 *
 * The label anchor (the arrow tip) always lands on the MIDPOINT of the label
 * edge nearest the arrow start, regardless of whether a target box exists. The
 * dominant axis of the drag (start -> tip) decides which edge:
 *
 *   horizontal arrow (|dx| >= |dy|): tip on the LEFT/RIGHT edge midpoint,
 *     label vertically centered on the arrow line.
 *   vertical arrow   (|dy| >  |dx|): tip on the TOP/BOTTOM edge midpoint,
 *     label horizontally centered on the arrow line.
 *
 * Because the rule keys only on the arrow direction, the rendered layout is
 * identical for target-box and no-target modes — there is no branch on whether
 * a target box exists, so the two modes can never diverge (the bug fixed here).
 *
 * All helpers are pure so they can be unit-tested and round-tripped.
 */

export interface Point {
  x: number;
  y: number;
}

export type LabelAxis = "horizontal" | "vertical";
export type LabelHSide = "left" | "right";
export type LabelVSide = "top" | "bottom";

export interface LabelDirection {
  axis: LabelAxis;
  side: LabelHSide | LabelVSide;
}

/**
 * Classify the drag direction (start -> tip) into an axis + side.
 *
 *   axis: "horizontal" when |dx| >= |dy|, else "vertical".
 *   side (horizontal): "right" when the tip is right of the start, else "left".
 *   side (vertical):   "bottom" when the tip is below the start, else "top".
 *
 * The label extends AWAY from the drag start, so a tip on the right of the
 * start means the label sits to the right of the start (side = "right"), and
 * the tip lands on the label's LEFT edge midpoint. (See directionalLabelBox.)
 */
export function labelDirection(start: Point, tip: Point): LabelDirection {
  const dx = tip.x - start.x;
  const dy = tip.y - start.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return { axis: "horizontal", side: dx >= 0 ? "right" : "left" };
  }
  return { axis: "vertical", side: dy >= 0 ? "bottom" : "top" };
}

/**
 * Place the label box given the drag direction and label size.
 *
 *   horizontal axis, side "right": label to the right of the start, tip on the
 *     label's LEFT edge midpoint  -> boxX = tip.x,           boxY = tip.y - H/2
 *   horizontal axis, side "left":  label to the left of the start, tip on the
 *     label's RIGHT edge midpoint -> boxX = tip.x - W,        boxY = tip.y - H/2
 *   vertical axis, side "bottom":  label below the start, tip on the label's
 *     TOP edge midpoint           -> boxX = tip.x - W/2,      boxY = tip.y
 *   vertical axis, side "top":     label above the start, tip on the label's
 *     BOTTOM edge midpoint        -> boxX = tip.x - W/2,      boxY = tip.y - H
 *
 * The tip always lands on an edge midpoint, so the label stays centered on the
 * arrow line on its dominant axis.
 */
export function directionalLabelBox(
  start: Point,
  tip: Point,
  boxWidth: number,
  boxHeight: number,
): { boxX: number; boxY: number } {
  const dir = labelDirection(start, tip);

  if (dir.axis === "horizontal") {
    const boxX = dir.side === "right" ? tip.x : tip.x - boxWidth;
    const boxY = tip.y - boxHeight / 2;
    return { boxX, boxY };
  }

  const boxX = tip.x - boxWidth / 2;
  const boxY = dir.side === "bottom" ? tip.y : tip.y - boxHeight;
  return { boxX, boxY };
}

/**
 * Inverse of directionalLabelBox: recover the arrow tip (label anchor) from the
 * rendered box position and the drag start. Classifies the axis from the box
 * CENTER vs the start (not the box top-left), so it agrees with
 * directionalLabelBox even when the box overhangs the tip on a short arrow.
 */
export function directionalLabelAnchor(
  start: Point,
  box: Rect,
): { x: number; y: number } {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = cx - start.x;
  const dy = cy - start.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal placement: tip on the box edge facing the arrow start.
    return {
      x: dx >= 0 ? box.x : box.x + box.width,
      y: cy,
    };
  }

  // Vertical placement: tip on the box edge facing the arrow start.
  return {
    x: cx,
    y: dy >= 0 ? box.y : box.y + box.height,
  };
}
