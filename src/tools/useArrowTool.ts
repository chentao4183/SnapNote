import { useRef } from "react";
import type Konva from "konva";
import { useEditorStore } from "../store/editorStore";
import { useToolStyleStore } from "../store/toolStyleStore";
import { useToolState } from "../store/toolState";
import { annotationFieldsFromToolStyle } from "../style/styleMapping";
import type { Annotation } from "../types/annotation";

export function useArrowTool() {
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const style = useToolStyleStore((s) => s.settings.arrow);
  const ts = useToolState();
  const startRef = useRef<{ x: number; y: number } | null>(null);

  function pos(e: Konva.KonvaEventObject<MouseEvent>) {
    return e.target.getStage()!.getPointerPosition()!;
  }

  return {
    preview: ts.arrowPreview,
    handlers: {
      onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
        const p = pos(e);
        startRef.current = p;
        ts.setArrowPreview({ sx: p.x, sy: p.y, ex: p.x, ey: p.y });
      },
      onMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!startRef.current) return;
        const p = pos(e);
        ts.setArrowPreview({ sx: startRef.current.x, sy: startRef.current.y, ex: p.x, ey: p.y });
      },
      onMouseUp: () => {
        const pr = ts.arrowPreview;
        if (pr && (Math.abs(pr.ex - pr.sx) > 3 || Math.abs(pr.ey - pr.sy) > 3)) {
          const a: Annotation = {
            id: crypto.randomUUID(),
            type: "arrow",
            arrow: { startX: pr.sx, startY: pr.sy, endX: pr.ex, endY: pr.ey },
            ...annotationFieldsFromToolStyle("arrow", useToolStyleStore.getState().settings),
          };
          addAnnotation(a);
        }
        startRef.current = null;
        ts.setArrowPreview(null);
      },
    },
    style,
  };
}
