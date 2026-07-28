/**
 * Pure geometry helpers for the pin-to-screen window.
 *
 * Pin windows keep the captured image at a 1:1 physical-pixel size initially.
 * Browser pointer coordinates are logical pixels, while Tauri window sizes can
 * be set in physical pixels. These helpers keep those conversions explicit.
 */

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 8;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Clamp a scale factor into the supported [MIN_SCALE, MAX_SCALE] range. */
export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Return the integer physical window size for a raster image at `scale`. */
export function scaledPhysicalSize(
  baseSize: { width: number; height: number },
  scale: number,
): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(baseSize.width * scale)),
    height: Math.max(1, Math.round(baseSize.height * scale)),
  };
}

/** Convert a physical-pixel size to browser/CSS logical pixels. */
export function physicalToLogicalSize(
  size: { width: number; height: number },
  scaleFactor: number,
): { width: number; height: number } {
  const factor = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1;
  return {
    width: size.width / factor,
    height: size.height / factor,
  };
}

/**
 * Compute the next window rect when scaling around the rect's center.
 *
 * The previous scale is needed because the input rect is already scaled; we
 * first undo `prevScale` to get the base size, then apply `nextScale`. The
 * center point (cx, cy) is preserved so the resize visually anchors on the
 * middle of the window rather than its top-left corner.
 */
export function scaleAroundCenter(rect: Rect, nextScale: number, prevScale: number): Rect {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const baseW = prevScale === 0 ? rect.width : rect.width / prevScale;
  const baseH = prevScale === 0 ? rect.height : rect.height / prevScale;
  const width = baseW * nextScale;
  const height = baseH * nextScale;
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}

/**
 * Compute the next scale factor from a corner-handle drag delta.
 *
 * The handle is the bottom-right corner of the window. The drag delta is the
 * change in pointer position since drag start, in logical pixels. We project
 * the delta onto the diagonal direction (1, aspectRatio) and use its signed
 * length relative to the base diagonal to produce a scale delta. This keeps
 * the aspect ratio locked regardless of where the user drags.
 *
 * `baseSize` is the 1:1 image size (width, height) at scale 1.
 */
export function scaleFromCornerDrag(
  baseSize: { width: number; height: number },
  dragStartPointer: { x: number; y: number },
  currentPointer: { x: number; y: number },
  dragStartScale: number,
): number {
  // Direction of the diagonal at scale 1. Length is the base diagonal.
  const dx = baseSize.width;
  const dy = baseSize.height;
  const diagLen = Math.hypot(dx, dy);
  if (diagLen === 0) return dragStartScale;
  const ux = dx / diagLen;
  const uy = dy / diagLen;

  // Signed distance moved along the diagonal direction.
  const moveX = currentPointer.x - dragStartPointer.x;
  const moveY = currentPointer.y - dragStartPointer.y;
  const projected = moveX * ux + moveY * uy;

  const baseDiagonal = diagLen * dragStartScale;
  const nextDiagonal = Math.max(diagLen * MIN_SCALE, baseDiagonal + projected);
  return clampScale(nextDiagonal / diagLen);
}
