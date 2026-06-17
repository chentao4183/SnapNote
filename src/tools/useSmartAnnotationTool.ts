import { useRef, useState } from "react";
import type Konva from "konva";
import { useEditorStore } from "../store/editorStore";
import { nearestCorner } from "../geometry/corners";
import { DEFAULT_STYLE, type Annotation, type Corner, type Rect } from "../types/annotation";

type Phase = "idle" | "dragging-rect" | "placing-arrow" | "entering-text";

/**
 * Drives the smart annotation 5-step flow:
 *   1. idle            - waiting for mousedown
 *   2. dragging-rect   - mouse held down, drawing the rect
 *   3. placing-arrow   - rect committed, arrow end follows the mouse
 *   4. (click)         - pin the arrow end; corner is finalized relative to the click
 *   5. entering-text   - label input is open; on submit the annotation is committed
 *
 * The start corner is finalized at the click in `placing-arrow`, picking the rect
 * corner nearest to where the label ends up (matches the spec's intent).
 */
export function useSmartAnnotationTool() {
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const [phase, setPhase] = useState<Phase>("idle");
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [previewRect, setPreviewRect] = useState<Rect | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [startCorner, setStartCorner] = useState<Corner>("tr");
  const [arrowEnd, setArrowEnd] = useState<{ x: number; y: number } | null>(null);
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);

  function pos(e: Konva.KonvaEventObject<MouseEvent>) {
    return e.target.getStage()!.getPointerPosition()!;
  }

  function onMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (phase !== "idle") return;
    const p = pos(e);
    dragStartRef.current = p;
    setPreviewRect({ x: p.x, y: p.y, width: 0, height: 0 });
    setPhase("dragging-rect");
  }

  function onMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    const p = pos(e);
    if (phase === "dragging-rect" && dragStartRef.current) {
      const s = dragStartRef.current;
      setPreviewRect({
        x: Math.min(s.x, p.x),
        y: Math.min(s.y, p.y),
        width: Math.abs(p.x - s.x),
        height: Math.abs(p.y - s.y),
      });
    } else if (phase === "placing-arrow") {
      setArrowEnd(p);
    }
  }

  function onMouseUp() {
    if (phase === "dragging-rect" && previewRect && previewRect.width > 5 && previewRect.height > 5) {
      setRect(previewRect);
      setStartCorner("tr"); // refined at the click below
      setPreviewRect(null);
      setPhase("placing-arrow");
    }
  }

  function onClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (phase !== "placing-arrow") return;
    const p = pos(e);
    const corner: Corner = rect ? nearestCorner(rect, p) : "tr";
    setStartCorner(corner);
    setArrowEnd(p);
    setTextPos(p);
    setPhase("entering-text");
  }

  function submitText(text: string) {
    if (!rect || !arrowEnd) {
      reset();
      return;
    }
    const a: Annotation = {
      id: crypto.randomUUID(),
      type: "smart",
      rect,
      note: text,
      arrow: { startCorner, endX: arrowEnd.x, endY: arrowEnd.y },
      style: { ...DEFAULT_STYLE },
    };
    addAnnotation(a);
    reset();
  }

  function reset() {
    setPhase("idle");
    dragStartRef.current = null;
    setPreviewRect(null);
    setRect(null);
    setStartCorner("tr");
    setArrowEnd(null);
    setTextPos(null);
  }

  return {
    phase,
    previewRect,
    rect,
    startCorner,
    arrowEnd,
    textPos,
    handlers: { onMouseDown, onMouseMove, onMouseUp, onClick },
    submitText,
    cancelText: reset,
  };
}
