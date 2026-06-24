import { describe, expect, it } from "vitest";
import type { Annotation } from "../types/annotation";
import { DEFAULT_NUMBERING_SETTINGS, type NumberingSettings } from "../types/numbering";
import { applyNumberBadgeIfEnabled } from "./applyNumbering";

function baseAnnotation(): Annotation {
  return {
    id: "a1",
    type: "rect",
    rect: { x: 0, y: 0, width: 10, height: 10 },
    style: {
      borderColor: "#ff4757",
      borderWidth: 3,
      bgColor: "#ff4757",
      textColor: "#ffffff",
      fontSize: 13,
    },
  };
}

describe("applyNumberBadgeIfEnabled", () => {
  it("does not attach a badge or consume a number when the tool is disabled", () => {
    const settings: NumberingSettings = {
      ...DEFAULT_NUMBERING_SETTINGS,
      enabledByTool: { smart: false, rect: false, arrow: false, text: false },
    };
    const annotation = baseAnnotation();

    const result = applyNumberBadgeIfEnabled("rect", annotation, settings, 1);

    expect(result.consumed).toBe(false);
    expect(result.annotation).toBe(annotation);
    expect(result.annotation.numberBadge).toBeUndefined();
  });

  it("attaches expected value/style and consumes a number when enabled", () => {
    const settings: NumberingSettings = {
      ...DEFAULT_NUMBERING_SETTINGS,
      enabledByTool: { smart: false, rect: true, arrow: false, text: false },
      badgeStyle: { color: "#abcdef", shape: "circle", fontSize: 18 },
    };

    const result = applyNumberBadgeIfEnabled("rect", baseAnnotation(), settings, 7);

    expect(result.consumed).toBe(true);
    expect(result.annotation.numberBadge).toEqual({
      value: 7,
      style: { color: "#abcdef", shape: "circle", fontSize: 18 },
    });
  });

  it("copies the badge style so later global style changes do not mutate it", () => {
    const settings: NumberingSettings = {
      ...DEFAULT_NUMBERING_SETTINGS,
      enabledByTool: { smart: true, rect: false, arrow: false, text: false },
      badgeStyle: { color: "#1677ff", shape: "square", fontSize: 13 },
    };

    const result = applyNumberBadgeIfEnabled("smart", baseAnnotation(), settings, 1);
    // mutate the source style after applying
    settings.badgeStyle.color = "#000000";

    expect(result.annotation.numberBadge?.style.color).toBe("#1677ff");
  });

  it("does not mutate the input annotation", () => {
    const settings: NumberingSettings = {
      ...DEFAULT_NUMBERING_SETTINGS,
      enabledByTool: { smart: true, rect: false, arrow: false, text: false },
    };
    const annotation = baseAnnotation();

    applyNumberBadgeIfEnabled("smart", annotation, settings, 1);

    expect(annotation.numberBadge).toBeUndefined();
  });
});
