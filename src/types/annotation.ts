export type ToolType = "select" | "smart" | "rect" | "arrow" | "text" | "mosaic";

export type Corner = "tl" | "tr" | "bl" | "br";
export type ShapeKind = "rect" | "ellipse";
export type SmartShapeKind = ShapeKind | "none";
export type LineStyle = "solid" | "dashed";

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
  // Legacy smart annotations may still store a corner id.
  startCorner?: Corner;
  // For 'arrow': absolute start coords. For 'smart': rect-edge anchor coords.
  startX?: number;
  startY?: number;
  endX: number;
  endY: number;
  // Where the text label sits. Falls back to (endX, endY) for compatibility.
  labelX?: number;
  labelY?: number;
}

export type BadgeShape = "square" | "rounded" | "circle";

export interface NumberBadgeStyle {
  color: string;
  shape: BadgeShape;
  fontSize: number;
}

export interface NumberBadge {
  value: number;
  style: NumberBadgeStyle;
}

export interface Annotation {
  id: string;
  type: ToolType;
  rect?: Rect;
  shape?: SmartShapeKind;
  lineStyle?: LineStyle;
  arrowHeadSize?: number;
  fontFamily?: string;
  note?: string;
  arrow?: ArrowData;
  style: AnnotationStyle;
  // V0.3.0: optional auto-incrementing number badge. Absent means no badge.
  numberBadge?: NumberBadge;
}

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}
