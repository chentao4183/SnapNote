import { describe, expect, it } from "vitest";
import { DEFAULT_TOOL_STYLES } from "../types/toolStyle";
import { loadToolStyleSettings, TOOL_STYLE_STORAGE_KEY } from "./toolStyleStore";

describe("loadToolStyleSettings", () => {
  it("falls back to defaults when localStorage is unavailable", () => {
    expect(loadToolStyleSettings()).toEqual(DEFAULT_TOOL_STYLES);
  });

  it("repairs invalid fields from persisted settings", () => {
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) =>
          key === TOOL_STYLE_STORAGE_KEY
            ? JSON.stringify({
                smart: { color: "red", strokeWidth: 99, shape: "triangle", fontSize: 4, fontFamily: 7 },
                rect: { color: "#1890ff", strokeWidth: 4, shape: "ellipse" },
                arrow: { color: "#52c41a", strokeWidth: 2, lineStyle: "dashed", arrowHeadSize: 18 },
                text: { color: "#000000", fontSize: 20, fontFamily: "Arial" },
              })
            : null,
      },
    });

    const settings = loadToolStyleSettings();
    expect(settings.smart).toEqual(DEFAULT_TOOL_STYLES.smart);
    expect(settings.rect).toEqual({ color: "#1890ff", strokeWidth: 4, shape: "ellipse" });
    expect(settings.arrow).toEqual({ color: "#52c41a", strokeWidth: 2, lineStyle: "dashed", arrowHeadSize: 18 });
    expect(settings.text).toEqual({ color: "#000000", fontSize: 20, fontFamily: "Arial" });

    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original });
  });
});
