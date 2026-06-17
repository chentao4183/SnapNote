import { useEffect } from "react";
import { useEditorStore } from "../store/editorStore";

interface Options {
  onExit?: () => void;
  onSave?: () => void;
}

/**
 * Global editor keyboard shortcuts, bound once at the EditorWindow level:
 *   Ctrl+Z          -> undo
 *   Ctrl+Shift+Z    -> redo
 *   Ctrl+Y          -> redo
 *   Ctrl+S          -> save (handled by caller)
 *   Esc             -> exit the editor window (handled by caller)
 */
export function useEditorShortcuts({ onExit, onSave }: Options) {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (ctrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave?.();
      } else if (e.key === "Escape") {
        onExit?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, onExit, onSave]);
}
