import type { Annotation, ArrowData, NumberBadgeStyle, Rect } from "../types/annotation";
import type {
  ArrowBadgePosition,
  EllipseBadgePosition,
  RectBadgePosition,
  SmartBadgePlacement,
  TextBadgePosition,
} from "../types/numbering";

export interface BadgeBox {
  width: number;
  height: number;
}

export interface TextBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const BADGE_HORIZONTAL_PADDING = 6;
export const BADGE_VERTICAL_PADDING = 3;
export const BADGE_MIN_SIZE = 18;
export const BADGE_ANCHOR_GAP = 4;
export const ARROW_BADGE_END_GAP = 12;
export const ARROW_BADGE_LINE_GAP = 8;
export const ARROW_BADGE_VERTICAL_EPSILON = 0.2;

/**
 * Measures a number badge. `measureText` returns the rendered width of a string
 * at a given font size so this module stays pure and testable.
 *
 * - square / circle: width === height, both >= BADGE_MIN_SIZE.
 * - rounded: width and height computed independently, both >= BADGE_MIN_SIZE.
 */
export function measureNumberBadge(
  value: number,
  style: NumberBadgeStyle,
  measureText: (text: string, fontSize: number) => number,
): BadgeBox {
  const text = String(value);
  const textWidth = measureText(text, style.fontSize);
  const horizontalMin = Math.max(textWidth + BADGE_HORIZONTAL_PADDING * 2, BADGE_MIN_SIZE);
  const verticalMin = Math.max(style.fontSize + BADGE_VERTICAL_PADDING * 2, BADGE_MIN_SIZE);

  if (style.shape === "rounded") {
    return { width: horizontalMin, height: verticalMin };
  }
  // square and circle render from a single size.
  const size = Math.max(horizontalMin, verticalMin);
  return { width: size, height: size };
}

/**
 * Clamps a rect so it stays inside crop. If the badge is larger than the crop
 * (per axis), it is pinned to crop origin on that axis.
 */
export function keepRectInsideCrop(rect: Rect, crop: Rect): Rect {
  const x = rect.width >= crop.width ? crop.x : clamp(rect.x, crop.x, crop.x + crop.width - rect.width);
  const y = rect.height >= crop.height ? crop.y : clamp(rect.y, crop.y, crop.y + crop.height - rect.height);
  return { x, y, width: rect.width, height: rect.height };
}

/**
 * Badge placement around a rectangle. Corners sit outside the rect; `center`
 * sits inside. Anything that falls outside the crop is pulled back inside.
 */
export function rectBadgeBox(rect: Rect, box: BadgeBox, position: RectBadgePosition, crop: Rect): Rect {
  let x: number;
  let y: number;

  switch (position) {
    case "top-left":
      x = rect.x - box.width;
      y = rect.y - box.height;
      break;
    case "top-right":
      x = rect.x + rect.width;
      y = rect.y - box.height;
      break;
    case "bottom-left":
      x = rect.x - box.width;
      y = rect.y + rect.height;
      break;
    case "bottom-right":
      x = rect.x + rect.width;
      y = rect.y + rect.height;
      break;
    case "center":
      x = rect.x + (rect.width - box.width) / 2;
      y = rect.y + (rect.height - box.height) / 2;
      break;
  }

  return keepRectInsideCrop({ x, y, width: box.width, height: box.height }, crop);
}

/**
 * Badge placement around an ellipse (described by its bounding rect).
 * left/right/top/bottom sit just outside the ellipse edge by BADGE_ANCHOR_GAP.
 */
export function ellipseBadgeBox(bounds: Rect, box: BadgeBox, position: EllipseBadgePosition, crop: Rect): Rect {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;

  let x: number;
  let y: number;

  switch (position) {
    case "left":
      x = bounds.x - BADGE_ANCHOR_GAP - box.width;
      y = cy - box.height / 2;
      break;
    case "right":
      x = bounds.x + bounds.width + BADGE_ANCHOR_GAP;
      y = cy - box.height / 2;
      break;
    case "top":
      x = cx - box.width / 2;
      y = bounds.y - BADGE_ANCHOR_GAP - box.height;
      break;
    case "bottom":
      x = cx - box.width / 2;
      y = bounds.y + bounds.height + BADGE_ANCHOR_GAP;
      break;
    case "center":
      x = cx - box.width / 2;
      y = cy - box.height / 2;
      break;
  }

  return keepRectInsideCrop({ x, y, width: box.width, height: box.height }, crop);
}

/**
 * Badge placement along an arrow. The badge is offset off the line instead of
 * sitting on top of it. End placement is pulled back far enough that the whole
 * badge sits before the arrow head, then offset, so arrow head size changes do
 * not collide with the badge. Near-vertical arrows place the badge on the left
 * side.
 */
export function arrowBadgeBox(arrow: ArrowData, box: BadgeBox, position: ArrowBadgePosition, crop: Rect): Rect {
  const startX = arrow.startX ?? arrow.endX;
  const startY = arrow.startY ?? arrow.endY;
  const endX = arrow.endX;
  const endY = arrow.endY;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy);
  const ux = length > 0 ? dx / length : 1;
  const uy = length > 0 ? dy / length : 0;

  let cx: number;
  let cy: number;

  switch (position) {
    case "start":
      cx = startX;
      cy = startY;
      break;
    case "middle":
      cx = (startX + endX) / 2;
      cy = (startY + endY) / 2;
      break;
    case "end":
      cx = endX - ux * (box.width / 2 + ARROW_BADGE_END_GAP);
      cy = endY - uy * (box.width / 2 + ARROW_BADGE_END_GAP);
      break;
  }

  const offset = box.height / 2 + ARROW_BADGE_LINE_GAP;
  let nx: number;
  let ny: number;

  if (Math.abs(ux) < ARROW_BADGE_VERTICAL_EPSILON) {
    nx = -1;
    ny = 0;
  } else {
    nx = 0;
    ny = -1;
  }

  const x = cx + nx * offset - box.width / 2;
  const y = cy + ny * offset - box.height / 2;
  return keepRectInsideCrop({ x, y, width: box.width, height: box.height }, crop);
}

/**
 * Badge placement beside a rendered text box. `left`/`right` sit one
 * BADGE_ANCHOR_GAP away from the text edge. The badge must not be embedded
 * inside the text content.
 */
export function textBadgeBox(textBox: TextBox, box: BadgeBox, position: TextBadgePosition, crop: Rect): Rect {
  let x: number;
  const y = textBox.y + (textBox.height - box.height) / 2;

  switch (position) {
    case "left":
      x = textBox.x - BADGE_ANCHOR_GAP - box.width;
      break;
    case "right":
      x = textBox.x + textBox.width + BADGE_ANCHOR_GAP;
      break;
  }

  return keepRectInsideCrop({ x, y, width: box.width, height: box.height }, crop);
}

/**
 * Resolves a smart annotation badge placement. The anchor determines which
 * sub-geometry helper is used. Missing rect/arrow data falls back to the
 * label box left side.
 */
export function smartBadgeBox(
  annotation: Annotation,
  placement: SmartBadgePlacement,
  labelBox: TextBox,
  badgeBox: BadgeBox,
  crop: Rect,
): Rect | null {
  switch (placement.anchor) {
    case "target": {
      if (!annotation.rect) return textBadgeBox(labelBox, badgeBox, "left", crop);
      if (annotation.shape === "ellipse") {
        return ellipseBadgeBox(annotation.rect, badgeBox, placement.targetEllipsePosition, crop);
      }
      return rectBadgeBox(annotation.rect, badgeBox, placement.targetRectPosition, crop);
    }
    case "arrow": {
      if (!annotation.arrow) return textBadgeBox(labelBox, badgeBox, "left", crop);
      return arrowBadgeBox(annotation.arrow, badgeBox, placement.arrowPosition, crop);
    }
    case "label":
    default:
      return textBadgeBox(labelBox, badgeBox, placement.labelPosition, crop);
  }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}
