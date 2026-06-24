import type { BadgeShape, NumberBadgeStyle } from "./annotation";

/**
 * Fixed 4-key union for tools that can produce a number badge.
 *
 * Do NOT derive from `ToolType`: it also includes `select` and `mosaic`,
 * which must not participate in auto-numbering.
 */
export type NumberedTool = "smart" | "rect" | "arrow" | "text";

export type RectBadgePosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

export type EllipseBadgePosition = "left" | "right" | "top" | "bottom" | "center";

export type ArrowBadgePosition = "start" | "middle" | "end";

export type TextBadgePosition = "left" | "right";

export type SmartBadgeAnchor = "target" | "arrow" | "label";

export interface SmartBadgePlacement {
  anchor: SmartBadgeAnchor;
  targetRectPosition: RectBadgePosition;
  targetEllipsePosition: EllipseBadgePosition;
  arrowPosition: ArrowBadgePosition;
  labelPosition: TextBadgePosition;
}

export interface TargetBadgePlacement {
  rectPosition: RectBadgePosition;
  ellipsePosition: EllipseBadgePosition;
}

export interface NumberingSettings {
  enabledByTool: Record<NumberedTool, boolean>;
  positionByTool: {
    smart: SmartBadgePlacement;
    rect: TargetBadgePlacement;
    arrow: ArrowBadgePosition;
    text: TextBadgePosition;
  };
  badgeStyle: NumberBadgeStyle;
}

export const DEFAULT_NUMBERING_SETTINGS: NumberingSettings = {
  enabledByTool: {
    smart: true,
    rect: false,
    arrow: false,
    text: false,
  },
  positionByTool: {
    smart: {
      anchor: "label",
      targetRectPosition: "top-left",
      targetEllipsePosition: "left",
      arrowPosition: "end",
      labelPosition: "left",
    },
    rect: {
      rectPosition: "top-left",
      ellipsePosition: "left",
    },
    arrow: "end",
    text: "left",
  },
  badgeStyle: {
    color: "#ff4757",
    shape: "circle",
    fontSize: 17,
  },
};

export const BADGE_SHAPE_VALUES: readonly BadgeShape[] = ["square", "rounded", "circle"];

export const RECT_BADGE_POSITION_VALUES: readonly RectBadgePosition[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center",
];

export const ELLIPSE_BADGE_POSITION_VALUES: readonly EllipseBadgePosition[] = [
  "left",
  "right",
  "top",
  "bottom",
  "center",
];

export const ARROW_BADGE_POSITION_VALUES: readonly ArrowBadgePosition[] = ["start", "middle", "end"];

export const TEXT_BADGE_POSITION_VALUES: readonly TextBadgePosition[] = ["left", "right"];

export const SMART_BADGE_ANCHOR_VALUES: readonly SmartBadgeAnchor[] = ["target", "arrow", "label"];

export const BADGE_FONT_SIZE_LIMITS = { min: 8, max: 72 } as const;
