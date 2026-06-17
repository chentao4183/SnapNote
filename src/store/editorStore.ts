import { create } from "zustand";
import type { Annotation, ToolType } from "../types/annotation";

interface EditorSnapshot {
  annotations: Annotation[];
}

interface EditorState {
  backgroundImage: string;
  selectionRect: { x: number; y: number; width: number; height: number };
  annotations: Annotation[];
  selectedId: string | null;
  currentTool: ToolType;
  history: EditorSnapshot[];
  redoStack: EditorSnapshot[];

  init: (bg: string, selection: { x: number; y: number; width: number; height: number }) => void;
  setTool: (t: ToolType) => void;
  addAnnotation: (a: Annotation) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  selectAnnotation: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
}

function snapshot(s: EditorState): EditorSnapshot {
  return { annotations: JSON.parse(JSON.stringify(s.annotations)) };
}

export const useEditorStore = create<EditorState>((set) => ({
  backgroundImage: "",
  selectionRect: { x: 0, y: 0, width: 0, height: 0 },
  annotations: [],
  selectedId: null,
  currentTool: "smart",
  history: [],
  redoStack: [],

  init: (bg, selection) =>
    set({ backgroundImage: bg, selectionRect: selection, annotations: [], selectedId: null, history: [], redoStack: [] }),

  setTool: (t) => set({ currentTool: t, selectedId: null }),

  addAnnotation: (a) =>
    set((s) => {
      const history = [...s.history, snapshot(s)];
      return { annotations: [...s.annotations, a], selectedId: a.id, history, redoStack: [] };
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

  undo: () =>
    set((s) => {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      return {
        annotations: prev.annotations,
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
        redoStack: s.redoStack.slice(0, -1),
        history: [...s.history, snapshot(s)],
        selectedId: null,
      };
    }),
}));
