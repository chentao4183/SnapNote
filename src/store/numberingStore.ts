import { create } from "zustand";
import type { BadgeShape, NumberBadgeStyle } from "../types/annotation";
import {
  ARROW_BADGE_POSITION_VALUES,
  BADGE_FONT_SIZE_LIMITS,
  BADGE_SHAPE_VALUES,
  DEFAULT_NUMBERING_SETTINGS,
  ELLIPSE_BADGE_POSITION_VALUES,
  RECT_BADGE_POSITION_VALUES,
  SMART_BADGE_ANCHOR_VALUES,
  TEXT_BADGE_POSITION_VALUES,
  type ArrowBadgePosition,
  type EllipseBadgePosition,
  type NumberedTool,
  type NumberingSettings,
  type RectBadgePosition,
  type SmartBadgeAnchor,
  type SmartBadgePlacement,
  type TargetBadgePlacement,
  type TextBadgePosition,
} from "../types/numbering";

export const NUMBERING_STORAGE_KEY = "stepmark.numbering.v1";

// Previous name (pre-rename). Kept only to migrate existing users once.
const LEGACY_NUMBERING_STORAGE_KEY = "snapnote.numbering.v1";

interface NumberingState {
  settings: NumberingSettings;
  updateSettings: (patch: Partial<NumberingSettings>) => void;
  updateEnabled: (tool: NumberedTool, enabled: boolean) => void;
  updateToolPlacement: <K extends keyof NumberingSettings["positionByTool"]>(
    tool: K,
    placement: NumberingSettings["positionByTool"][K],
  ) => void;
  updateBadgeStyle: (patch: Partial<NumberBadgeStyle>) => void;
  resetSettings: () => void;
}

export function loadNumberingSettings(): NumberingSettings {
  try {
    migrateLegacyKey();
    const raw = getStorage()?.getItem(NUMBERING_STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return cloneDefaults();
    const p = parsed as Partial<NumberingSettings>;
    return {
      enabledByTool: validateEnabledByTool(p.enabledByTool),
      positionByTool: validatePositionByTool(p.positionByTool),
      badgeStyle: validateBadgeStyle(p.badgeStyle),
    };
  } catch {
    return cloneDefaults();
  }
}

export const useNumberingStore = create<NumberingState>((set, get) => ({
  settings: loadNumberingSettings(),
  updateSettings: (patch) => {
    const base = get().settings;
    const next: NumberingSettings = {
      enabledByTool: patch.enabledByTool ? validateEnabledByTool(patch.enabledByTool) : base.enabledByTool,
      positionByTool: patch.positionByTool ? validatePositionByTool(patch.positionByTool) : base.positionByTool,
      badgeStyle: patch.badgeStyle ? validateBadgeStyle(patch.badgeStyle) : base.badgeStyle,
    };
    persist(next);
    set({ settings: next });
  },
  updateEnabled: (tool, enabled) => {
    const base = get().settings;
    const next: NumberingSettings = {
      ...base,
      enabledByTool: { ...base.enabledByTool, [tool]: enabled },
    };
    persist(next);
    set({ settings: next });
  },
  updateToolPlacement: (tool, placement) => {
    const base = get().settings;
    const nextPosition = { ...base.positionByTool, [tool]: placement };
    const next: NumberingSettings = {
      ...base,
      positionByTool: validatePositionByTool(nextPosition),
    };
    persist(next);
    set({ settings: next });
  },
  updateBadgeStyle: (patch) => {
    const base = get().settings;
    const next: NumberingSettings = {
      ...base,
      badgeStyle: validateBadgeStyle({ ...base.badgeStyle, ...patch }),
    };
    persist(next);
    set({ settings: next });
  },
  resetSettings: () => {
    const next = cloneDefaults();
    persist(next);
    set({ settings: next });
  },
}));

function validateEnabledByTool(value: unknown): NumberingSettings["enabledByTool"] {
  const d = DEFAULT_NUMBERING_SETTINGS.enabledByTool;
  if (!isRecord(value)) return { ...d };
  return {
    smart: typeof value.smart === "boolean" ? value.smart : d.smart,
    rect: typeof value.rect === "boolean" ? value.rect : d.rect,
    arrow: typeof value.arrow === "boolean" ? value.arrow : d.arrow,
    text: typeof value.text === "boolean" ? value.text : d.text,
  };
}

function validatePositionByTool(value: unknown): NumberingSettings["positionByTool"] {
  const d = DEFAULT_NUMBERING_SETTINGS.positionByTool;
  if (!isRecord(value)) return clonePlacement(d);
  return {
    smart: validateSmartPlacement(value.smart),
    rect: validateTargetPlacement(value.rect),
    arrow: isArrowPosition(value.arrow) ? value.arrow : d.arrow,
    text: isTextPosition(value.text) ? value.text : d.text,
  };
}

function validateSmartPlacement(value: unknown): SmartBadgePlacement {
  const d = DEFAULT_NUMBERING_SETTINGS.positionByTool.smart;
  if (!isRecord(value)) return { ...d };
  return {
    anchor: isSmartAnchor(value.anchor) ? value.anchor : d.anchor,
    targetRectPosition: isRectPosition(value.targetRectPosition) ? value.targetRectPosition : d.targetRectPosition,
    targetEllipsePosition: isEllipsePosition(value.targetEllipsePosition)
      ? value.targetEllipsePosition
      : d.targetEllipsePosition,
    arrowPosition: isArrowPosition(value.arrowPosition) ? value.arrowPosition : d.arrowPosition,
    labelPosition: isTextPosition(value.labelPosition) ? value.labelPosition : d.labelPosition,
  };
}

function validateTargetPlacement(value: unknown): TargetBadgePlacement {
  const d = DEFAULT_NUMBERING_SETTINGS.positionByTool.rect;
  if (!isRecord(value)) return { ...d };
  return {
    rectPosition: isRectPosition(value.rectPosition) ? value.rectPosition : d.rectPosition,
    ellipsePosition: isEllipsePosition(value.ellipsePosition) ? value.ellipsePosition : d.ellipsePosition,
  };
}

function validateBadgeStyle(value: unknown): NumberBadgeStyle {
  const d = DEFAULT_NUMBERING_SETTINGS.badgeStyle;
  if (!isRecord(value)) return { ...d };
  const legacyBgColor = value.bgColor;
  return {
    color: validColor(value.color) ? value.color : validColor(legacyBgColor) ? legacyBgColor : d.color,
    shape: isBadgeShape(value.shape) ? value.shape : d.shape,
    fontSize: validInt(value.fontSize, BADGE_FONT_SIZE_LIMITS.min, BADGE_FONT_SIZE_LIMITS.max)
      ? value.fontSize
      : d.fontSize,
  };
}

function persist(settings: NumberingSettings) {
  try {
    getStorage()?.setItem(NUMBERING_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to persist numbering settings", error);
  }
}

/**
 * One-time migration from the pre-rename key (snapnote → stepmark).
 * If the legacy key exists and the new key does not, copy it over and remove the legacy key.
 */
function migrateLegacyKey(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const legacy = storage.getItem(LEGACY_NUMBERING_STORAGE_KEY);
    if (!legacy) return;
    if (storage.getItem(NUMBERING_STORAGE_KEY) == null) {
      storage.setItem(NUMBERING_STORAGE_KEY, legacy);
    }
    storage.removeItem(LEGACY_NUMBERING_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to migrate legacy numbering key", error);
  }
}

function getStorage(): Storage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function cloneDefaults(): NumberingSettings {
  return JSON.parse(JSON.stringify(DEFAULT_NUMBERING_SETTINGS)) as NumberingSettings;
}

function clonePlacement(d: NumberingSettings["positionByTool"]): NumberingSettings["positionByTool"] {
  return JSON.parse(JSON.stringify(d));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function validInt(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function isBadgeShape(value: unknown): value is BadgeShape {
  return typeof value === "string" && (BADGE_SHAPE_VALUES as readonly string[]).includes(value);
}

function isRectPosition(value: unknown): value is RectBadgePosition {
  return typeof value === "string" && (RECT_BADGE_POSITION_VALUES as readonly string[]).includes(value);
}

function isEllipsePosition(value: unknown): value is EllipseBadgePosition {
  return typeof value === "string" && (ELLIPSE_BADGE_POSITION_VALUES as readonly string[]).includes(value);
}

function isArrowPosition(value: unknown): value is ArrowBadgePosition {
  return typeof value === "string" && (ARROW_BADGE_POSITION_VALUES as readonly string[]).includes(value);
}

function isTextPosition(value: unknown): value is TextBadgePosition {
  return typeof value === "string" && (TEXT_BADGE_POSITION_VALUES as readonly string[]).includes(value);
}

function isSmartAnchor(value: unknown): value is SmartBadgeAnchor {
  return typeof value === "string" && (SMART_BADGE_ANCHOR_VALUES as readonly string[]).includes(value);
}
