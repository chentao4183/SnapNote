import { describe, expect, it } from "vitest";
import { DEFAULT_STYLE } from "../types/annotation";
import { INLINE_BADGE_GAP, LABEL_PAD_X, LABEL_PAD_Y, labelBoxLayoutFromTextWidth } from "./labelMetrics";

describe("labelBoxLayoutFromTextWidth", () => {
  it("keeps the original text box layout when there is no inline badge", () => {
    const layout = labelBoxLayoutFromTextWidth(30, DEFAULT_STYLE);

    expect(layout.width).toBe(50);
    expect(layout.height).toBe(DEFAULT_STYLE.fontSize + LABEL_PAD_Y * 2);
    expect(layout.textX).toBe(LABEL_PAD_X);
    expect(layout.badgeBox).toBeNull();
  });

  it("embeds a left badge before the text", () => {
    const badge = { width: 22, height: 22 };
    const layout = labelBoxLayoutFromTextWidth(40, DEFAULT_STYLE, { box: badge, position: "left" });

    expect(layout.width).toBe(LABEL_PAD_X * 2 + badge.width + INLINE_BADGE_GAP + 40);
    expect(layout.textX).toBe(LABEL_PAD_X + badge.width + INLINE_BADGE_GAP);
    expect(layout.badgeBox).toEqual({
      x: LABEL_PAD_X,
      y: LABEL_PAD_Y,
      width: badge.width,
      height: badge.height,
    });
  });

  it("embeds a right badge after the text", () => {
    const badge = { width: 22, height: 22 };
    const layout = labelBoxLayoutFromTextWidth(40, DEFAULT_STYLE, { box: badge, position: "right" });

    expect(layout.textX).toBe(LABEL_PAD_X);
    expect(layout.badgeBox).toEqual({
      x: layout.width - LABEL_PAD_X - badge.width,
      y: LABEL_PAD_Y,
      width: badge.width,
      height: badge.height,
    });
  });

  it("grows vertically when the badge is taller than text", () => {
    const layout = labelBoxLayoutFromTextWidth(40, DEFAULT_STYLE, { box: { width: 30, height: 30 }, position: "left" });

    expect(layout.height).toBe(30 + LABEL_PAD_Y * 2);
    expect(layout.textY).toBe((layout.height - DEFAULT_STYLE.fontSize) / 2);
    expect(layout.badgeBox?.y).toBe(LABEL_PAD_Y);
  });
});
