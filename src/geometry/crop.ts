import type { Rect } from "../types/annotation";

export const MIN_CROP_SIZE = 20;

export function clampCrop(
  crop: Rect,
  source: { width: number; height: number },
  minSize = MIN_CROP_SIZE,
): Rect {
  const safeMinWidth = Math.min(minSize, source.width);
  const safeMinHeight = Math.min(minSize, source.height);

  let x = clamp(crop.x, 0, Math.max(0, source.width - safeMinWidth));
  let y = clamp(crop.y, 0, Math.max(0, source.height - safeMinHeight));
  let width = Math.max(safeMinWidth, crop.width);
  let height = Math.max(safeMinHeight, crop.height);

  if (x + width > source.width) {
    width = source.width - x;
  }
  if (y + height > source.height) {
    height = source.height - y;
  }

  if (width < safeMinWidth) {
    x = Math.max(0, source.width - safeMinWidth);
    width = safeMinWidth;
  }
  if (height < safeMinHeight) {
    y = Math.max(0, source.height - safeMinHeight);
    height = safeMinHeight;
  }

  return { x, y, width, height };
}

export type CropHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export function resizeCropFromHandle(
  original: Rect,
  handle: CropHandle,
  delta: { x: number; y: number },
  source: { width: number; height: number },
  minSize = MIN_CROP_SIZE,
): Rect {
  let left = original.x;
  let top = original.y;
  let right = original.x + original.width;
  let bottom = original.y + original.height;

  if (handle.includes("w")) left += delta.x;
  if (handle.includes("e")) right += delta.x;
  if (handle.includes("n")) top += delta.y;
  if (handle.includes("s")) bottom += delta.y;

  left = clamp(left, 0, source.width);
  right = clamp(right, 0, source.width);
  top = clamp(top, 0, source.height);
  bottom = clamp(bottom, 0, source.height);

  if (right - left < minSize) {
    if (handle.includes("w")) left = Math.max(0, right - minSize);
    else right = Math.min(source.width, left + minSize);
  }
  if (bottom - top < minSize) {
    if (handle.includes("n")) top = Math.max(0, bottom - minSize);
    else bottom = Math.min(source.height, top + minSize);
  }

  return clampCrop({ x: left, y: top, width: right - left, height: bottom - top }, source, minSize);
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}
