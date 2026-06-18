import { describe, expect, it } from "vitest";
import { clampCrop, resizeCropFromHandle } from "./crop";

describe("crop geometry", () => {
  const source = { width: 300, height: 200 };

  it("clamps crop inside the source bounds", () => {
    expect(clampCrop({ x: -10, y: -20, width: 500, height: 300 }, source)).toEqual({
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
  });

  it("enforces the minimum crop size", () => {
    expect(clampCrop({ x: 290, y: 190, width: 2, height: 2 }, source)).toEqual({
      x: 280,
      y: 180,
      width: 20,
      height: 20,
    });
  });

  it("resizes from left/top handles while preserving the opposite side", () => {
    expect(resizeCropFromHandle({ x: 50, y: 50, width: 100, height: 80 }, "nw", { x: -30, y: -20 }, source)).toEqual({
      x: 20,
      y: 30,
      width: 130,
      height: 100,
    });
  });
});
