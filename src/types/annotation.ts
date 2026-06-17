export type ToolType = "select" | "smart" | "rect" | "arrow" | "text" | "mosaic";

export type Corner = "tl" | "tr" | "bl" | "br";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationStyle {
  borderColor: string;
  borderWidth: number;
  bgColor: string;
  textColor: string;
  fontSize: number;
}

export const DEFAULT_STYLE: AnnotationStyle = {
  borderColor: "#ff4757",
  borderWidth: 3,
  bgColor: "#ff4757",
  textColor: "#ffffff",
  fontSize: 13,
};

export interface ArrowData {
  // For 'smart': which corner of the rect the arrow starts from.
  startCorner?: Corner;
  // For 'arrow' tool: absolute start coords (rect-independent).
  startX?: number;
  startY?: number;
  endX: number;
  endY: number;
}

export interface Annotation {
  id: string;
  type: ToolType;
  rect?: Rect;
  note?: string;
  arrow?: ArrowData;
  style: AnnotationStyle;
}

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}
