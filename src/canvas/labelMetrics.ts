import type { AnnotationStyle, Rect } from "../types/annotation";
import type { BadgeBox } from "../geometry/numberBadge";
import type { TextBadgePosition } from "../types/numbering";

export const LABEL_PAD_X = 10;
export const LABEL_PAD_Y = 5;
export const INLINE_BADGE_GAP = 4;

export function labelBoxSize(text: string, style: AnnotationStyle, fontFamily: string | undefined): { width: number; height: number } {
  const layout = labelBoxLayout(text, style, fontFamily);
  return { width: layout.width, height: layout.height };
}

export interface InlineBadgeSpec {
  box: BadgeBox;
  position: TextBadgePosition;
}

export interface LabelBoxLayout {
  width: number;
  height: number;
  textX: number;
  textY: number;
  badgeBox: Rect | null;
}

export function labelBoxLayout(
  text: string,
  style: AnnotationStyle,
  fontFamily: string | undefined,
  inlineBadge?: InlineBadgeSpec | null,
): LabelBoxLayout {
  const textWidth = measureTextWidth(text, style.fontSize, fontFamily);
  return labelBoxLayoutFromTextWidth(textWidth, style, inlineBadge);
}

export function labelBoxLayoutFromTextWidth(
  textWidth: number,
  style: AnnotationStyle,
  inlineBadge?: InlineBadgeSpec | null,
): LabelBoxLayout {
  const badge = inlineBadge?.box;
  const inlineBadgeWidth = badge ? badge.width + INLINE_BADGE_GAP : 0;
  const contentWidth = textWidth + inlineBadgeWidth;
  const width = Math.max(40, contentWidth + LABEL_PAD_X * 2);
  const height = Math.max(style.fontSize + LABEL_PAD_Y * 2, badge ? badge.height + LABEL_PAD_Y * 2 : 0);

  const textY = (height - style.fontSize) / 2;
  if (!badge || !inlineBadge) {
    return {
      width,
      height,
      textX: LABEL_PAD_X,
      textY,
      badgeBox: null,
    };
  }

  const badgeY = (height - badge.height) / 2;
  if (inlineBadge.position === "left") {
    return {
      width,
      height,
      textX: LABEL_PAD_X + badge.width + INLINE_BADGE_GAP,
      textY,
      badgeBox: { x: LABEL_PAD_X, y: badgeY, width: badge.width, height: badge.height },
    };
  }

  return {
    width,
    height,
    textX: LABEL_PAD_X,
    textY,
    badgeBox: { x: width - LABEL_PAD_X - badge.width, y: badgeY, width: badge.width, height: badge.height },
  };
}

export function labelFontFamily(fontFamily: string | undefined): string {
  return fontFamily || 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif';
}

function measureTextWidth(text: string, fontSize: number, fontFamily: string | undefined): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return text.length * fontSize * 0.6;
  ctx.font = `${fontSize}px ${labelFontFamily(fontFamily)}`;
  return ctx.measureText(text).width;
}
