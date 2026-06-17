import { useEditorStore } from "../store/editorStore";
import { useSmartAnnotationTool } from "./useSmartAnnotationTool";
import { useRectTool } from "./useRectTool";
import { useArrowTool } from "./useArrowTool";
import { useTextTool } from "./useTextTool";
import { useMosaicTool } from "./useMosaicTool";

/**
 * Instantiates every tool once per render and returns the active one. All five
 * hooks are cheap; only the active tool's handlers get attached to the Stage.
 * Callers that need shared state (EditorStage + EditorWindow) MUST use this so
 * they observe the same tool instance.
 */
export function useActiveTool() {
  const tool = useEditorStore((s) => s.currentTool);
  const smart = useSmartAnnotationTool();
  const rect = useRectTool();
  const arrow = useArrowTool();
  const text = useTextTool();
  const mosaic = useMosaicTool();

  switch (tool) {
    case "select":
      return { kind: "select" as const };
    case "smart":
      return { kind: "smart" as const, smart };
    case "rect":
      return { kind: "rect" as const, rect };
    case "arrow":
      return { kind: "arrow" as const, arrow };
    case "text":
      return { kind: "text" as const, text };
    case "mosaic":
      return { kind: "mosaic" as const, mosaic };
  }
}
