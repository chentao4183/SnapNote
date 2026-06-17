import { useEffect, useState } from "react";
import { useEditorStore } from "../store/editorStore";
import type { Annotation } from "../types/annotation";

/**
 * Selection-mode orchestration:
 *  - click a shape -> select it (id)
 *  - Delete/Backspace -> remove the selected annotation
 *  - Ctrl+Z / Ctrl+Shift+Z -> undo / redo (Task 14 wires keys too; keep here for cohesion)
 *  - double-click a text/smart annotation -> open an inline editor to re-edit its note
 *
 * Drag-to-move is handled per-shape (draggable + onDragEnd -> updateAnnotation),
 * so this hook only owns selection + keyboard actions + the re-edit overlay state.
 */
export function useSelectionTool() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const removeAnnotation = useEditorStore((s) => s.removeAnnotation);
  const [editing, setEditing] = useState<{ id: string; x: number; y: number; initial: string } | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore when typing in an input/textarea.
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          removeAnnotation(selectedId);
        }
      } else if (e.key === "Escape") {
        setEditing(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, removeAnnotation]);

  function beginEditText(a: Annotation, anchorScreenX: number, anchorScreenY: number) {
    setEditing({ id: a.id, x: anchorScreenX, y: anchorScreenY, initial: a.note || "" });
  }

  function commitEditText(text: string) {
    if (editing) {
      useEditorStore.getState().updateAnnotation(editing.id, { note: text });
    }
    setEditing(null);
  }

  return {
    selectedId,
    editing,
    beginEditText,
    commitEditText,
    cancelEdit: () => setEditing(null),
  };
}
