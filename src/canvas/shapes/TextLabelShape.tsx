import { Group, Rect, Text } from "react-konva";
import { smartArrowStart } from "../../geometry/arrowAnchor";
import { measureNumberBadge } from "../../geometry/numberBadge";
import { resolveLabelAnchor, resolveLabelBox } from "../../geometry/smartLabelBox";
import { useEditorStore } from "../../store/editorStore";
import { useNumberingStore } from "../../store/numberingStore";
import type { Annotation } from "../../types/annotation";
import { measureBadgeTextWidth } from "../badgeText";
import { labelBoxLayout } from "../labelMetrics";
import NumberBadgeShape from "./NumberBadgeShape";

interface Props {
  a: Annotation;
  selectable?: boolean;
  onEditText?: (a: Annotation, x: number, y: number) => void;
}

export default function TextLabelShape({ a, selectable = false, onEditText }: Props) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.selectAnnotation);
  const update = useEditorStore((s) => s.updateAnnotation);
  const smartPlacement = useNumberingStore((s) => s.settings.positionByTool.smart);
  const textPlacement = useNumberingStore((s) => s.settings.positionByTool.text);
  const isSelected = selectable && selectedId === a.id;

  if (!a.arrow) return null;
  if (a.note === undefined || a.note.trim() === "") return null;

  const text = a.note;
  const labelX = a.arrow.labelX ?? a.arrow.endX;
  const labelY = a.arrow.labelY ?? a.arrow.endY;
  const inlineBadgePosition =
    a.numberBadge && a.type === "text"
      ? textPlacement
      : a.numberBadge && a.type === "smart" && smartPlacement.anchor === "label"
        ? smartPlacement.labelPosition
        : null;
  const inlineBadge =
    a.numberBadge && inlineBadgePosition
      ? {
          box: measureNumberBadge(a.numberBadge.value, a.numberBadge.style, measureBadgeTextWidth),
          position: inlineBadgePosition,
        }
      : null;
  const layout = labelBoxLayout(text, a.style, a.fontFamily, inlineBadge);
  const { width: boxWidth, height: boxHeight } = layout;
  const { boxX, boxY } = resolveLabelBox(a, labelX, labelY, boxWidth, boxHeight);

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
        const { labelX: newLabelX, labelY: newLabelY } = resolveLabelAnchor(a, e.target.x(), e.target.y(), boxWidth, boxHeight);
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
      {a.numberBadge && layout.badgeBox && <NumberBadgeShape badge={a.numberBadge} box={layout.badgeBox} />}
      <Text
        x={layout.textX}
        y={layout.textY}
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
