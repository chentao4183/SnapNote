import type { Annotation, AnnotationStyle, ToolType } from "../types/annotation";
import type { ToolStyleSettings } from "../types/toolStyle";

type StyledTool = Extract<ToolType, "smart" | "rect" | "arrow" | "text">;

export function annotationFieldsFromToolStyle(
  tool: StyledTool,
  settings: ToolStyleSettings,
): Pick<Annotation, "style" | "shape" | "lineStyle" | "arrowHeadSize" | "fontFamily"> {
  switch (tool) {
    case "smart": {
      const t = settings.smart;
      return {
        style: style(t.color, t.strokeWidth, t.color, "#ffffff", t.fontSize),
        shape: t.shape,
        fontFamily: t.fontFamily,
      };
    }
    case "rect": {
      const t = settings.rect;
      return {
        style: style(t.color, t.strokeWidth, t.color, t.color, 13),
        shape: t.shape,
      };
    }
    case "arrow": {
      const t = settings.arrow;
      return {
        style: style(t.color, t.strokeWidth, t.color, t.color, 13),
        lineStyle: t.lineStyle,
        arrowHeadSize: t.arrowHeadSize,
      };
    }
    case "text": {
      const t = settings.text;
      return {
        style: style(t.color, 3, t.color, t.color, t.fontSize),
        fontFamily: t.fontFamily,
      };
    }
  }
}

function style(
  borderColor: string,
  borderWidth: number,
  bgColor: string,
  textColor: string,
  fontSize: number,
): AnnotationStyle {
  return { borderColor, borderWidth, bgColor, textColor, fontSize };
}
