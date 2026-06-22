import { create } from "zustand";
import type { Annotation, Rect, ToolType } from "../types/annotation";
import { clampCrop } from "../geometry/crop";

interface EditorSnapshot {
  annotations: Annotation[];
  cropRegion: Rect;
  nextNumber: number;
}

interface EditorState {
  sourceImage: string;
  cropRegion: Rect;
  sourceWidth: number;
  sourceHeight: number;
  annotations: Annotation[];
  selectedId: string | null;
  currentTool: ToolType;
  // V0.3.0: per-screenshot auto-number sequence. Resets to 1 on init.
  nextNumber: number;
  history: EditorSnapshot[];
  redoStack: EditorSnapshot[];

  init: (bg: string, crop: Rect, sourceSize?: { width: number; height: number }) => void;
  setTool: (t: ToolType) => void;
  setCropRegion: (crop: Rect) => void;
  beginCropChange: () => void;
  addAnnotation: (a: Annotation, options?: { consumedNumber?: boolean }) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  selectAnnotation: (id: string | null) => void;
  // Reset next number to 1 for future annotations only. Does NOT touch
  // existing annotations and does NOT push an undo/redo history entry.
  resetNextNumber: () => void;
  undo: () => void;
  redo: () => void;
}

function snapshot(s: EditorState): EditorSnapshot {
  return {
    annotations: JSON.parse(JSON.stringify(s.annotations)) as Annotation[],
    cropRegion: { ...s.cropRegion },
    nextNumber: s.nextNumber,
  };
}

export const useEditorStore = create<EditorState>((set) => ({
  sourceImage: "",
  cropRegion: { x: 0, y: 0, width: 0, height: 0 },
  sourceWidth: typeof window !== "undefined" ? window.innerWidth : 0,
  sourceHeight: typeof window !== "undefined" ? window.innerHeight : 0,
  annotations: [],
  selectedId: null,
  currentTool: "smart",
  nextNumber: 1,
  history: [],
  redoStack: [],

  init: (bg, crop, sourceSize) =>
    set({
      sourceImage: bg,
      cropRegion: crop,
      sourceWidth: sourceSize?.width ?? (typeof window !== "undefined" ? window.innerWidth : 0),
      sourceHeight: sourceSize?.height ?? (typeof window !== "undefined" ? window.innerHeight : 0),
      annotations: [],
      selectedId: null,
      nextNumber: 1,
      history: [],
      redoStack: [],
    }),

  setTool: (t) => set({ currentTool: t, selectedId: null }),

  setCropRegion: (crop) =>
    set((s) => ({
      cropRegion: clampCrop(crop, { width: s.sourceWidth, height: s.sourceHeight }),
    })),

  beginCropChange: () =>
    set((s) => ({
      history: [...s.history, snapshot(s)],
      redoStack: [],
      selectedId: null,
    })),

  addAnnotation: (a, options) =>
    set((s) => {
      const history = [...s.history, snapshot(s)];
      const consumedNumber = options?.consumedNumber === true;
      return {
        annotations: [...s.annotations, a],
        selectedId: null,
        history,
        redoStack: [],
        nextNumber: consumedNumber ? s.nextNumber + 1 : s.nextNumber,
      };
    }),

  updateAnnotation: (id, patch) =>
    set((s) => {
      const history = [...s.history, snapshot(s)];
      return {
        annotations: s.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        history,
        redoStack: [],
      };
    }),

  removeAnnotation: (id) =>
    set((s) => {
      const history = [...s.history, snapshot(s)];
      return {
        annotations: s.annotations.filter((a) => a.id !== id),
        selectedId: null,
        history,
        redoStack: [],
      };
    }),

  selectAnnotation: (id) => set({ selectedId: id }),

  resetNextNumber: () => set({ nextNumber: 1 }),

  undo: () =>
    set((s) => {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      return {
        annotations: prev.annotations,
        cropRegion: prev.cropRegion,
        nextNumber: prev.nextNumber,
        history: s.history.slice(0, -1),
        redoStack: [...s.redoStack, snapshot(s)],
        selectedId: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.redoStack.length === 0) return s;
      const next = s.redoStack[s.redoStack.length - 1];
      return {
        annotations: next.annotations,
        cropRegion: next.cropRegion,
        nextNumber: next.nextNumber,
        redoStack: s.redoStack.slice(0, -1),
        history: [...s.history, snapshot(s)],
        selectedId: null,
      };
    }),
}));
