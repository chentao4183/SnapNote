import { describe, expect, it } from "vitest";
import { DEFAULT_TOOL_STYLES } from "../types/toolStyle";
import { annotationFieldsFromToolStyle } from "./styleMapping";

describe("annotationFieldsFromToolStyle", () => {
  it("maps smart styles to shape, label font, and frame-colored label text", () => {
    const fields = annotationFieldsFromToolStyle("smart", {
      ...DEFAULT_TOOL_STYLES,
      smart: { color: "#1890ff", strokeWidth: 5, shape: "ellipse", fontSize: 20, fontFamily: "Arial" },
    });

    expect(fields.shape).toBe("ellipse");
    expect(fields.fontFamily).toBe("Arial");
    expect(fields.style).toEqual({
      borderColor: "#1890ff",
      borderWidth: 5,
      bgColor: "#1890ff",
      textColor: "#1890ff",
      fontSize: 20,
    });
  });

  it("maps smart styles without a target boundary", () => {
    const fields = annotationFieldsFromToolStyle("smart", {
      ...DEFAULT_TOOL_STYLES,
      smart: { color: "#ff4757", strokeWidth: 3, shape: "none", fontSize: 17, fontFamily: "" },
    });

    expect(fields.shape).toBe("none");
  });

  it("maps arrow line style and arrow head size", () => {
    const fields = annotationFieldsFromToolStyle("arrow", {
      ...DEFAULT_TOOL_STYLES,
      arrow: { color: "#52c41a", strokeWidth: 2, lineStyle: "dashed", arrowHeadSize: 16 },
    });

    expect(fields.lineStyle).toBe("dashed");
    expect(fields.arrowHeadSize).toBe(16);
    expect(fields.style.borderColor).toBe("#52c41a");
  });
});
