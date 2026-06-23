import { useRef } from "react";
import type Konva from "konva";
import { smartArrowStart } from "../geometry/arrowAnchor";
import { labelSide, labelVerticalAnchor } from "../geometry/labelBox";
import { applyNumberBadgeIfEnabled } from "../numbering/applyNumbering";
import { pendingNumberBadgeForTool } from "../numbering/pendingNumberBadge";
import { useEditorStore } from "../store/editorStore";
import { useNumberingStore } from "../store/numberingStore";
import { useToolStyleStore } from "../store/toolStyleStore";
import { useToolState } from "../store/toolState";
import { annotationFieldsFromToolStyle } from "../style/styleMapping";
import type { Annotation } from "../types/annotation";

type Phase = "idle" | "drawing-rect" | "selecting-label-position" | "editing-label";

export function useSmartAnnotationTool() {
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const style = useToolStyleStore((s) => s.settings.smart);
  const smartPlacement = useNumberingStore((s) => s.settings.positionByTool.smart);
  const ts = useToolState();
  const phaseRef = useRef<Phase>("idle");
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const rectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const skipNextClickRef = useRef(false);

  function setPhase(p: Phase) {
    phaseRef.current = p;
  }

  function pos(e: Konva.KonvaEventObject<MouseEvent>) {
    return e.target.getStage()!.getPointerPosition()!;
  }

  const handlers = {
    onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (phaseRef.current !== "idle") return;
      const p = pos(e);
      dragStartRef.current = p;
      ts.setSmart({ previewRect: { x: p.x, y: p.y, width: 0, height: 0 } });
      setPhase("drawing-rect");
    },
    onMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => {
      const p = pos(e);
      if (phaseRef.current === "drawing-rect" && dragStartRef.current) {
        const s = dragStartRef.current;
        ts.setSmart({
          previewRect: {
            x: Math.min(s.x, p.x),
            y: Math.min(s.y, p.y),
            width: Math.abs(p.x - s.x),
            height: Math.abs(p.y - s.y),
          },
        });
      } else if (phaseRef.current === "selecting-label-position" && rectRef.current) {
        ts.setSmart({
          arrowStart: smartArrowStart(style.shape, rectRef.current, p),
          arrowEnd: p,
        });
      }
    },
    onMouseUp: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (phaseRef.current !== "drawing-rect") return;
      const r = ts.previewRect;
      if (!r || r.width <= 5 || r.height <= 5) {
        reset();
        return;
      }

      const p = pos(e);
      rectRef.current = r;
      skipNextClickRef.current = true;
      ts.setSmart({
        previewRect: null,
        rect: r,
        arrowStart: smartArrowStart(style.shape, r, p),
        arrowEnd: p,
        textPos: null,
      });
      setPhase("selecting-label-position");
    },
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (phaseRef.current !== "selecting-label-position" || !rectRef.current) return;
      if (skipNextClickRef.current) {
        skipNextClickRef.current = false;
        return;
      }

      const p = pos(e);
      const numberingSettings = useNumberingStore.getState().settings;
      const pendingNumberBadge =
        numberingSettings.positionByTool.smart.anchor === "label"
          ? pendingNumberBadgeForTool("smart", numberingSettings, useEditorStore.getState().nextNumber)
          : null;
      ts.setSmart({
        arrowStart: smartArrowStart(style.shape, rectRef.current, p),
        arrowEnd: p,
        textPos: p,
        pendingSmartNumberBadge: pendingNumberBadge,
      });
      setPhase("editing-label");
    },
  };

  function submitText(text: string) {
    const rect = ts.rect;
    const arrowStart = ts.arrowStart;
    const arrowEnd = ts.arrowEnd;
    const labelAnchor = ts.textPos;

    if (rect && arrowStart && arrowEnd && labelAnchor && text.trim()) {
      const settings = useToolStyleStore.getState().settings;
      const fields = annotationFieldsFromToolStyle("smart", settings);
      const base: Annotation = {
        id: crypto.randomUUID(),
        type: "smart",
        rect,
        ...fields,
        note: text,
        arrow: {
          startX: arrowStart.x,
          startY: arrowStart.y,
          endX: arrowEnd.x,
          endY: arrowEnd.y,
          labelX: labelAnchor.x,
          labelY: labelAnchor.y,
        },
      };
      if (ts.pendingSmartNumberBadge) {
        addAnnotation({ ...base, numberBadge: ts.pendingSmartNumberBadge }, { consumedNumber: true });
      } else {
        const numberingSettings = useNumberingStore.getState().settings;
        const nextNumber = useEditorStore.getState().nextNumber;
        const { annotation, consumed } = applyNumberBadgeIfEnabled("smart", base, numberingSettings, nextNumber);
        addAnnotation(annotation, { consumedNumber: consumed });
      }
    }
    reset();
  }

  function reset() {
    setPhase("idle");
    dragStartRef.current = null;
    rectRef.current = null;
    skipNextClickRef.current = false;
    ts.resetSmart();
  }

  return {
    phase: phaseRef.current,
    previewRect: ts.previewRect,
    rect: ts.rect,
    arrowStart: ts.arrowStart,
    arrowEnd: ts.arrowEnd,
    textPos: ts.textPos,
    pendingNumberBadge: ts.pendingSmartNumberBadge,
    smartBadgeLabelPosition: smartPlacement.labelPosition,
    textAlign: ts.rect && ts.textPos && labelSide(ts.textPos, ts.rect) === "left" ? ("right" as const) : ("left" as const),
    textVerticalAnchor: ts.rect && ts.textPos ? labelVerticalAnchor(ts.textPos, ts.rect) : ("top" as const),
    shape: style.shape,
    style,
    isEnteringText: ts.textPos !== null,
    handlers,
    submitText,
    cancelText: reset,
  };
}
