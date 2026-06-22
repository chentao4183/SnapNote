import { Group, Rect, Text } from "react-konva";
import { smartArrowStart } from "../../geometry/arrowAnchor";
import {
  labelAnchorFromBoxPosition,
  labelBoxOffset,
  labelBoxPosition as positionLabelBox,
  labelSide,
  labelVerticalAnchor,
} from "../../geometry/labelBox";
import { useEditorStore } from "../../store/editorStore";
import type { Annotation } from "../../types/annotation";
import { LABEL_PAD_X, LABEL_PAD_Y, labelBoxSize } from "../labelMetrics";

interface Props {
  a: Annotation;
  selectable?: boolean;
  onEditText?: (a: Annotation, x: number, y: number) => void;
}

export default function TextLabelShape({ a, selectable = false, onEditText }: Props) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.selectAnnotation);
  const update = useEditorStore((s) => s.updateAnnotation);
  const isSelected = selectable && selectedId === a.id;

  if (!a.arrow) return null;
  if (a.note === undefined || a.note.trim() === "") return null;

  const text = a.note;
  const labelX = a.arrow.labelX ?? a.arrow.endX;
  const labelY = a.arrow.labelY ?? a.arrow.endY;
  const { width: boxWidth, height: boxHeight } = labelBoxSize(text, a.style, a.fontFamily);
  const { boxX, boxY } = labelBoxPosition(a, labelX, labelY, boxWidth, boxHeight);

  return (
    <Group
      x={boxX}
      y={boxY}
      listening={selectable}
      draggable={isSelected}
      onClick={(e) => {
        if (!selectable) return;
        e.cancelBubble = true;
        select(a.id);
      }}
      onTap={(e) => {
        if (!selectable) return;
        e.cancelBubble = true;
        select(a.id);
      }}
      onDblClick={(e) => {
        if (!selectable || !onEditText) return;
        e.cancelBubble = true;
        onEditText(a, labelX, labelY);
      }}
      onDragEnd={(e) => {
        const { labelX: newLabelX, labelY: newLabelY } = labelAnchorFromBox(a, e.target.x(), e.target.y(), boxWidth, boxHeight);
        e.target.position({ x: boxX, y: boxY });
        const nextStart = a.rect ? smartArrowStart(a.shape ?? "rect", a.rect, { x: newLabelX, y: newLabelY }) : null;
        update(a.id, {
          arrow: {
            ...a.arrow!,
            startCorner: a.rect ? undefined : a.arrow!.startCorner,
            startX: nextStart?.x,
            startY: nextStart?.y,
            endX: newLabelX,
            endY: newLabelY,
            labelX: newLabelX,
            labelY: newLabelY,
          },
        });
      }}
    >
      {a.type !== "text" && (
        <Rect x={0} y={0} width={boxWidth} height={boxHeight} fill={a.style.bgColor} cornerRadius={4} />
      )}
      <Text
        x={LABEL_PAD_X}
        y={LABEL_PAD_Y}
        text={text}
        fill={a.style.textColor}
        fontSize={a.style.fontSize}
        fontFamily={a.fontFamily || undefined}
        listening={false}
      />
      {isSelected && (
        <Rect
          x={-4}
          y={-4}
          width={boxWidth + 8}
          height={boxHeight + 8}
          stroke="#1e90ff"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      )}
    </Group>
  );
}

function labelBoxPosition(
  a: Annotation,
  labelX: number,
  labelY: number,
  boxWidth: number,
  boxHeight: number,
): { boxX: number; boxY: number } {
  if (a.rect) {
    const anchor = { x: labelX, y: labelY };
    return positionLabelBox(anchor, labelSide(anchor, a.rect), boxWidth, boxHeight, labelVerticalAnchor(anchor, a.rect));
  }
  if (a.arrow?.startCorner) {
    const off = labelBoxOffset(a.arrow.startCorner, boxWidth, boxHeight);
    return { boxX: labelX + off.dx, boxY: labelY + off.dy };
  }
  return { boxX: labelX, boxY: labelY };
}

function labelAnchorFromBox(
  a: Annotation,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number,
): { labelX: number; labelY: number } {
  if (a.rect) {
    const oldAnchor = { x: a.arrow?.endX ?? boxX, y: a.arrow?.endY ?? boxY };
    const anchor = labelAnchorFromBoxPosition(
      { x: boxX, y: boxY },
      labelSide(oldAnchor, a.rect),
      labelVerticalAnchor(oldAnchor, a.rect),
      boxWidth,
      boxHeight,
    );
    return { labelX: anchor.x, labelY: anchor.y };
  }
  if (a.arrow?.startCorner) {
    const off = labelBoxOffset(a.arrow.startCorner, boxWidth, boxHeight);
    return { labelX: boxX - off.dx, labelY: boxY - off.dy };
  }
  return { labelX: boxX, labelY: boxY };
}
