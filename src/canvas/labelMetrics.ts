import type { AnnotationStyle } from "../types/annotation";

export const LABEL_PAD_X = 10;
export const LABEL_PAD_Y = 5;

export function labelBoxSize(text: string, style: AnnotationStyle, fontFamily: string | undefined): { width: number; height: number } {
  const textWidth = measureTextWidth(text, style.fontSize, fontFamily);
  return {
    width: Math.max(40, textWidth + LABEL_PAD_X * 2),
    height: style.fontSize + LABEL_PAD_Y * 2,
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
