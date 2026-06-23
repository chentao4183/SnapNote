import type Konva from "konva";
import { applyNumberBadgeIfEnabled } from "../numbering/applyNumbering";
import { pendingNumberBadgeForTool } from "../numbering/pendingNumberBadge";
import { useEditorStore } from "../store/editorStore";
import { useNumberingStore } from "../store/numberingStore";
import { useToolStyleStore } from "../store/toolStyleStore";
import { useToolState } from "../store/toolState";
import { annotationFieldsFromToolStyle } from "../style/styleMapping";
import type { Annotation } from "../types/annotation";

export function useTextTool() {
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const style = useToolStyleStore((s) => s.settings.text);
  const numberBadgePosition = useNumberingStore((s) => s.settings.positionByTool.text);
  const ts = useToolState();

  function pos(e: Konva.KonvaEventObject<MouseEvent>) {
    return e.target.getStage()!.getPointerPosition()!;
  }

  function submit(text: string) {
    if (ts.textPos && text.trim()) {
      const base: Annotation = {
        id: crypto.randomUUID(),
        type: "text",
        note: text,
        arrow: { endX: ts.textPos.x, endY: ts.textPos.y },
        ...annotationFieldsFromToolStyle("text", useToolStyleStore.getState().settings),
      };
      if (ts.pendingTextNumberBadge) {
        addAnnotation({ ...base, numberBadge: ts.pendingTextNumberBadge }, { consumedNumber: true });
      } else {
        const numberingSettings = useNumberingStore.getState().settings;
        const nextNumber = useEditorStore.getState().nextNumber;
        const { annotation, consumed } = applyNumberBadgeIfEnabled("text", base, numberingSettings, nextNumber);
        addAnnotation(annotation, { consumedNumber: consumed });
      }
    }
    ts.setTextPos(null);
  }

  return {
    textPos: ts.textPos,
    handlers: {
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
        const numberingSettings = useNumberingStore.getState().settings;
        ts.setTextPos(pos(e), pendingNumberBadgeForTool("text", numberingSettings, useEditorStore.getState().nextNumber));
      },
    },
    submit,
    cancel: () => ts.setTextPos(null),
    style,
    pendingNumberBadge: ts.pendingTextNumberBadge,
    numberBadgePosition,
  };
}
