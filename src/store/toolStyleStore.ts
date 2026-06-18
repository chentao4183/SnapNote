import { create } from "zustand";
import {
  DEFAULT_TOOL_STYLES,
  TOOL_STYLE_LIMITS,
  type ArrowToolStyle,
  type RectToolStyle,
  type SmartToolStyle,
  type TextToolStyle,
  type ToolStyleSettings,
} from "../types/toolStyle";

export const TOOL_STYLE_STORAGE_KEY = "snapnote.toolStyles.v1";

interface ToolStyleState {
  settings: ToolStyleSettings;
  updateTool: <K extends keyof ToolStyleSettings>(tool: K, patch: Partial<ToolStyleSettings[K]>) => void;
  resetTool: (tool: keyof ToolStyleSettings) => void;
}

export function loadToolStyleSettings(): ToolStyleSettings {
  try {
    const raw = getStorage()?.getItem(TOOL_STYLE_STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return cloneDefaults();
    const p = parsed as Partial<ToolStyleSettings>;
    return {
      smart: validateSmart(p.smart),
      rect: validateRect(p.rect),
      arrow: validateArrow(p.arrow),
      text: validateText(p.text),
    };
  } catch {
    return cloneDefaults();
  }
}

export const useToolStyleStore = create<ToolStyleState>((set, get) => ({
  settings: loadToolStyleSettings(),
  updateTool: (tool, patch) => {
    const next = {
      ...get().settings,
      [tool]: validateTool(tool, { ...get().settings[tool], ...patch }),
    };
    persist(next);
    set({ settings: next });
  },
  resetTool: (tool) => {
    const next = { ...get().settings, [tool]: DEFAULT_TOOL_STYLES[tool] };
    persist(next);
    set({ settings: next });
  },
}));

function validateTool<K extends keyof ToolStyleSettings>(tool: K, value: unknown): ToolStyleSettings[K] {
  switch (tool) {
    case "smart":
      return validateSmart(value) as ToolStyleSettings[K];
    case "rect":
      return validateRect(value) as ToolStyleSettings[K];
    case "arrow":
      return validateArrow(value) as ToolStyleSettings[K];
    case "text":
      return validateText(value) as ToolStyleSettings[K];
  }
}

function validateSmart(value: unknown): SmartToolStyle {
  const d = DEFAULT_TOOL_STYLES.smart;
  if (!isRecord(value)) return { ...d };
  return {
    color: validColor(value.color) ? value.color : d.color,
    strokeWidth: validInt(value.strokeWidth, TOOL_STYLE_LIMITS.strokeWidth.min, TOOL_STYLE_LIMITS.strokeWidth.max)
      ? value.strokeWidth
      : d.strokeWidth,
    shape: value.shape === "rect" || value.shape === "ellipse" ? value.shape : d.shape,
    fontSize: validInt(value.fontSize, TOOL_STYLE_LIMITS.fontSize.min, TOOL_STYLE_LIMITS.fontSize.max)
      ? value.fontSize
      : d.fontSize,
    fontFamily: typeof value.fontFamily === "string" ? value.fontFamily : d.fontFamily,
  };
}

function validateRect(value: unknown): RectToolStyle {
  const d = DEFAULT_TOOL_STYLES.rect;
  if (!isRecord(value)) return { ...d };
  return {
    color: validColor(value.color) ? value.color : d.color,
    strokeWidth: validInt(value.strokeWidth, TOOL_STYLE_LIMITS.strokeWidth.min, TOOL_STYLE_LIMITS.strokeWidth.max)
      ? value.strokeWidth
      : d.strokeWidth,
    shape: value.shape === "rect" || value.shape === "ellipse" ? value.shape : d.shape,
  };
}

function validateArrow(value: unknown): ArrowToolStyle {
  const d = DEFAULT_TOOL_STYLES.arrow;
  if (!isRecord(value)) return { ...d };
  return {
    color: validColor(value.color) ? value.color : d.color,
    strokeWidth: validInt(value.strokeWidth, TOOL_STYLE_LIMITS.strokeWidth.min, TOOL_STYLE_LIMITS.strokeWidth.max)
      ? value.strokeWidth
      : d.strokeWidth,
    lineStyle: value.lineStyle === "solid" || value.lineStyle === "dashed" ? value.lineStyle : d.lineStyle,
    arrowHeadSize: validInt(
      value.arrowHeadSize,
      TOOL_STYLE_LIMITS.arrowHeadSize.min,
      TOOL_STYLE_LIMITS.arrowHeadSize.max,
    )
      ? value.arrowHeadSize
      : d.arrowHeadSize,
  };
}

function validateText(value: unknown): TextToolStyle {
  const d = DEFAULT_TOOL_STYLES.text;
  if (!isRecord(value)) return { ...d };
  return {
    color: validColor(value.color) ? value.color : d.color,
    fontSize: validInt(value.fontSize, TOOL_STYLE_LIMITS.fontSize.min, TOOL_STYLE_LIMITS.fontSize.max)
      ? value.fontSize
      : d.fontSize,
    fontFamily: typeof value.fontFamily === "string" ? value.fontFamily : d.fontFamily,
  };
}

function persist(settings: ToolStyleSettings) {
  try {
    getStorage()?.setItem(TOOL_STYLE_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to persist tool styles", error);
  }
}

function getStorage(): Storage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function cloneDefaults(): ToolStyleSettings {
  return JSON.parse(JSON.stringify(DEFAULT_TOOL_STYLES)) as ToolStyleSettings;
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
