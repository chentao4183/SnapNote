import { directionalLabelAnchor, directionalLabelBox } from "./directionalLabelBox";
import { cornerPoint } from "./corners";
import type { Annotation } from "../types/annotation";

/**
 * Shared smart/text label box math.
 *
 * Both target-box and no-target modes route through ONE direction-driven path:
 * the arrow tip always lands on the midpoint of the label edge nearest the
 * arrow start (see directionalLabelBox). This is what makes the rendered layout
 * identical regardless of whether a target box exists — there is no branch on
 * mode, so the two modes can never diverge (the bug previously fixed here).
 *
 * The text label tool (no arrow, just note) falls back to placing its top-left
 * at the stored anchor.
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
  const start = arrowStartPoint(a);
  if (start) {
    // Direction-driven placement: tip lands on the nearest label edge midpoint,
    // identical for target-box and no-target modes.
    return directionalLabelBox(start, { x: labelX, y: labelY }, boxWidth, boxHeight);
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
  const start = arrowStartPoint(a);
  if (start) {
    // Inverse of directionalLabelBox so drag-to-edit stays consistent.
    const anchor = directionalLabelAnchor(start, { x: boxX, y: boxY, width: boxWidth, height: boxHeight });
    return { labelX: anchor.x, labelY: anchor.y };
  }
  return { labelX: boxX, labelY: boxY };
}

/**
 * Resolve the arrow start point used for direction classification.
 *
 * - Target-box mode: the arrow starts on the target boundary (recomputed from
 *   the rect/ellipse + the label anchor via smartArrowStart at render time, but
 *   for direction purposes the stored startX/startY — when present — is the
 *   truth). When only a rect + startCorner are stored, use the corner point.
 * - No-target mode: startX/startY are always stored (the drag start).
 *
 * Both reduce to a single point, so resolveLabelBox/resolveLabelAnchor share
 * one direction-driven path with no mode branch.
 */
function arrowStartPoint(a: Annotation): { x: number; y: number } | null {
  if (a.arrow?.startX !== undefined && a.arrow?.startY !== undefined) {
    return { x: a.arrow.startX, y: a.arrow.startY };
  }
  if (a.rect && a.arrow?.startCorner) {
    // Legacy target-box annotations stored only startCorner: the corner point
    // is a stable proxy for direction (the corner sits on the side facing the
    // label), so direction classification still works.
    return cornerPoint(a.rect, a.arrow.startCorner);
  }
  return null;
}
