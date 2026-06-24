import { useRef } from "react";
import type Konva from "konva";
import { smartArrowStart } from "../geometry/arrowAnchor";
import { labelDirection } from "../geometry/directionalLabelBox";
import { applyNumberBadgeIfEnabled } from "../numbering/applyNumbering";
import { pendingNumberBadgeForTool } from "../numbering/pendingNumberBadge";
import { useEditorStore } from "../store/editorStore";
import { useNumberingStore } from "../store/numberingStore";
import { useToolStyleStore } from "../store/toolStyleStore";
import { useToolState } from "../store/toolState";
import { annotationFieldsFromToolStyle } from "../style/styleMapping";
import type { Annotation, ShapeKind } from "../types/annotation";

type Phase = "idle" | "drawing-rect" | "drawing-arrow" | "selecting-label-position" | "editing-label";

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
      if (style.shape === "none") {
        ts.setSmart({ rect: null, previewRect: null, arrowStart: p, arrowEnd: p, textPos: null });
        setPhase("drawing-arrow");
        return;
      }
      ts.setSmart({ previewRect: { x: p.x, y: p.y, width: 0, height: 0 } });
      setPhase("drawing-rect");
    },
    onMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => {
      const p = pos(e);
      if (phaseRef.current === "drawing-arrow" && dragStartRef.current) {
        ts.setSmart({
          arrowStart: dragStartRef.current,
          arrowEnd: p,
        });
      } else if (phaseRef.current === "drawing-rect" && dragStartRef.current) {
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
          arrowStart: smartArrowStart(targetShape(), rectRef.current, p),
          arrowEnd: p,
        });
      }
    },
    onMouseUp: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (phaseRef.current === "drawing-arrow") {
        const start = dragStartRef.current;
        const p = pos(e);
        if (!start || Math.hypot(p.x - start.x, p.y - start.y) <= 5) {
          reset();
          return;
        }

        const numberingSettings = useNumberingStore.getState().settings;
        const pendingNumberBadge =
          numberingSettings.positionByTool.smart.anchor === "label"
            ? pendingNumberBadgeForTool("smart", numberingSettings, useEditorStore.getState().nextNumber)
            : null;
        ts.setSmart({
          rect: null,
          previewRect: null,
          arrowStart: start,
          arrowEnd: p,
          textPos: p,
          pendingSmartNumberBadge: pendingNumberBadge,
        });
        setPhase("editing-label");
        return;
      }
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
        arrowStart: smartArrowStart(targetShape(), r, p),
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
        arrowStart: smartArrowStart(targetShape(), rectRef.current, p),
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

    if ((rect || style.shape === "none") && arrowStart && arrowEnd && labelAnchor && text.trim()) {
      const settings = useToolStyleStore.getState().settings;
      const fields = annotationFieldsFromToolStyle("smart", settings);
      const base: Annotation = {
        id: crypto.randomUUID(),
        type: "smart",
        ...(rect ? { rect } : {}),
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

  function targetShape(): ShapeKind {
    return style.shape === "ellipse" ? "ellipse" : "rect";
  }

  const { textAlign, textVerticalAnchor } = resolveTextInputAlign(ts.textPos, ts.arrowStart);

  return {
    phase: phaseRef.current,
    previewRect: ts.previewRect,
    rect: ts.rect,
    arrowStart: ts.arrowStart,
    arrowEnd: ts.arrowEnd,
    textPos: ts.textPos,
    pendingNumberBadge: ts.pendingSmartNumberBadge,
    smartBadgeLabelPosition: smartPlacement.labelPosition,
    textAlign,
    textVerticalAnchor,
    shape: style.shape,
    style,
    isEnteringText: ts.textPos !== null,
    handlers,
    submitText,
    cancelText: reset,
  };
}

/**
 * Resolve the text-input overlay's alignment so the editing box lands on the
 * same spot as the rendered label. Mirrors directionalLabelBox exactly: the
 * dominant axis of the drag (arrow start -> text anchor) decides placement, and
 * the rule is the SAME for target-box and no-target modes, so the editing box
 * never jumps when switching modes.
 *
 *   horizontal axis: label beside the tip on the arrow line -> input flips to
 *     the opposite side, vertically centered (verticalAnchor "middle").
 *   vertical axis: label above/below the tip, centered on the line -> input
 *     uses align "center", anchored to the edge facing the arrow start.
 */
function resolveTextInputAlign(
  textPos: { x: number; y: number } | null,
  arrowStart: { x: number; y: number } | null,
): {
  textAlign: "left" | "right" | "center";
  textVerticalAnchor: "top" | "middle" | "bottom";
} {
  if (textPos && arrowStart) {
    const dir = labelDirection(arrowStart, textPos);
    if (dir.axis === "horizontal") {
      // Label sits beside the tip: tip on the edge facing the start. Input
      // aligns to the OPPOSITE side so its near edge lands on the tip.
      return {
        textAlign: dir.side === "right" ? "left" : "right",
        textVerticalAnchor: "middle",
      };
    }
    // Vertical: label above/below the tip, horizontally centered on the line.
    return {
      textAlign: "center",
      textVerticalAnchor: dir.side === "bottom" ? "top" : "bottom",
    };
  }
  return { textAlign: "left", textVerticalAnchor: "top" };
}
