import { create } from "zustand";
import type { Corner, NumberBadge, Rect } from "../types/annotation";

/**
 * Ephemeral, cross-component tool state.
 *
 * Each drawing tool's in-progress state lives here so that both the Stage
 * (which consumes mouse handlers) and the Window (which renders overlays such
 * as the text input) observe the SAME state machine instance, regardless of
 * which component initiated the interaction.
 *
 * Fields are union-ish; only the subset relevant to the current tool is used.
 */

interface ArrowDraft {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
}

interface SmartDraft {
  previewRect: Rect | null;
  rect: Rect | null;
  startCorner: Corner;
  arrowStart: { x: number; y: number } | null;
  arrowEnd: { x: number; y: number } | null;
  textPos: { x: number; y: number } | null;
  pendingSmartNumberBadge: NumberBadge | null;
}

interface ToolState extends SmartDraft {
  rectPreview: Rect | null;
  mosaicPreview: Rect | null;
  arrowPreview: ArrowDraft | null;
  textPos: { x: number; y: number } | null; // standalone text tool anchor
  pendingTextNumberBadge: NumberBadge | null;

  setSmart: (patch: Partial<SmartDraft>) => void;
  setRectPreview: (r: Rect | null) => void;
  setMosaicPreview: (r: Rect | null) => void;
  setArrowPreview: (a: ArrowDraft | null) => void;
  setTextPos: (p: { x: number; y: number } | null, pendingNumberBadge?: NumberBadge | null) => void;
  resetSmart: () => void;
  resetAll: () => void;
}

const emptySmart: SmartDraft = {
  previewRect: null,
  rect: null,
  startCorner: "tr",
  arrowStart: null,
  arrowEnd: null,
  textPos: null,
  pendingSmartNumberBadge: null,
};

export const useToolState = create<ToolState>((set) => ({
  ...emptySmart,
  rectPreview: null,
  mosaicPreview: null,
  arrowPreview: null,
  textPos: null,
  pendingTextNumberBadge: null,

  setSmart: (patch) => set(patch),
  setRectPreview: (r) => set({ rectPreview: r }),
  setMosaicPreview: (r) => set({ mosaicPreview: r }),
  setArrowPreview: (a) => set({ arrowPreview: a }),
  setTextPos: (p, pendingNumberBadge = null) => set({ textPos: p, pendingTextNumberBadge: pendingNumberBadge }),
  resetSmart: () => set({ ...emptySmart }),
  resetAll: () =>
    set({ ...emptySmart, rectPreview: null, mosaicPreview: null, arrowPreview: null, textPos: null, pendingTextNumberBadge: null }),
}));
