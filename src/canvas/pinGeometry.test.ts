import { describe, it, expect } from "vitest";
import {
  MIN_SCALE,
  MAX_SCALE,
  clampScale,
  physicalToLogicalSize,
  scaledPhysicalSize,
  scaleAroundCenter,
  scaleFromCornerDrag,
} from "./pinGeometry";

describe("clampScale", () => {
  it("keeps in-range values", () => {
    expect(clampScale(1)).toBe(1);
    expect(clampScale(0.5)).toBe(0.5);
  });

  it("clamps below the minimum", () => {
    expect(clampScale(0)).toBe(MIN_SCALE);
    expect(clampScale(-1)).toBe(MIN_SCALE);
  });

  it("clamps above the maximum", () => {
    expect(clampScale(10)).toBe(MAX_SCALE);
    expect(clampScale(100)).toBe(MAX_SCALE);
  });
});

describe("pin pixel sizing", () => {
  it("keeps the source raster 1:1 at scale 1", () => {
    expect(scaledPhysicalSize({ width: 501, height: 301 }, 1)).toEqual({
      width: 501,
      height: 301,
    });
  });

  it("rounds scaled window dimensions to whole physical pixels", () => {
    expect(scaledPhysicalSize({ width: 501, height: 301 }, 1.25)).toEqual({
      width: 626,
      height: 376,
    });
  });

  it("converts physical image size to CSS size for mixed-DPI monitors", () => {
    expect(physicalToLogicalSize({ width: 600, height: 300 }, 1.5)).toEqual({
      width: 400,
      height: 200,
    });
  });

  it("falls back safely for an invalid DPI factor", () => {
    expect(physicalToLogicalSize({ width: 600, height: 300 }, 0)).toEqual({
      width: 600,
      height: 300,
    });
  });
});

describe("scaleAroundCenter", () => {
  it("preserves the center point", () => {
    const rect = { x: 100, y: 200, width: 50, height: 80 };
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const next = scaleAroundCenter(rect, 2, 1);
    expect(next.x + next.width / 2).toBeCloseTo(cx, 5);
    expect(next.y + next.height / 2).toBeCloseTo(cy, 5);
  });

  it("doubles size when going from scale 1 to scale 2", () => {
    const rect = { x: 0, y: 0, width: 100, height: 60 };
    const next = scaleAroundCenter(rect, 2, 1);
    expect(next.width).toBe(200);
    expect(next.height).toBe(120);
  });

  it("chains through an intermediate scale using prevScale", () => {
    // rect is already at scale 2 (200x120 from a 100x60 base). Scale to 3.
    const rect = { x: 0, y: 0, width: 200, height: 120 };
    const next = scaleAroundCenter(rect, 3, 2);
    expect(next.width).toBe(300);
    expect(next.height).toBe(180);
  });

  it("handles scaling down", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    const next = scaleAroundCenter(rect, 0.5, 1);
    expect(next.width).toBe(50);
    expect(next.height).toBe(50);
  });
});

describe("scaleFromCornerDrag", () => {
  const baseSize = { width: 100, height: 100 };
  const startPointer = { x: 100, y: 100 };

  it("returns start scale when the pointer does not move", () => {
    expect(scaleFromCornerDrag(baseSize, startPointer, startPointer, 1)).toBe(1);
  });

  it("increases scale when dragging outward along the diagonal", () => {
    // Diagonal unit vector is (1/sqrt2, 1/sqrt2) for a 100x100 base. A delta
    // of (+10, +10) projects to ~14.14 along the diagonal; base diagonal is
    // ~141.42, so the resulting scale is 1 + 14.14/141.42 = 1.1.
    const next = scaleFromCornerDrag(baseSize, startPointer, { x: 110, y: 110 }, 1);
    expect(next).toBeGreaterThan(1);
    expect(next).toBeCloseTo(1.1, 3);
  });

  it("does not drop below MIN_SCALE when dragging inward hard", () => {
    // currentPointer far to the upper-left of startPointer.
    const next = scaleFromCornerDrag(baseSize, startPointer, { x: -1000, y: -1000 }, 1);
    expect(next).toBe(MIN_SCALE);
  });

  it("does not exceed MAX_SCALE when dragging outward hard", () => {
    const next = scaleFromCornerDrag(baseSize, startPointer, { x: 10100, y: 10100 }, 1);
    expect(next).toBe(MAX_SCALE);
  });

  it("ignores motion perpendicular to the diagonal", () => {
    // Delta of (+50, -50) lies along the anti-diagonal, whose projection onto
    // the (1,1) diagonal is 0. currentPointer = startPointer + delta.
    const next = scaleFromCornerDrag(baseSize, startPointer, { x: 150, y: 50 }, 1);
    expect(next).toBe(1);
  });
});
