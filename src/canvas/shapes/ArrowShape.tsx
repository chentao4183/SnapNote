import { Arrow } from "react-konva";
import { useEditorStore } from "../../store/editorStore";
import type { Annotation } from "../../types/annotation";

interface Props {
  a: Annotation;
  selectable?: boolean;
}

export default function ArrowShape({ a, selectable = false }: Props) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.selectAnnotation);
  const update = useEditorStore((s) => s.updateAnnotation);
  const isSelected = selectable && selectedId === a.id;

  if (!a.arrow) return null;
  const start =
    a.arrow.startX !== undefined && a.arrow.startY !== undefined
      ? { x: a.arrow.startX, y: a.arrow.startY }
      : null;
  const points = start
    ? [start.x, start.y, a.arrow.endX, a.arrow.endY]
    : [a.arrow.endX, a.arrow.endY, a.arrow.endX, a.arrow.endY];
  const headSize = a.arrowHeadSize ?? 10;
  const dash = a.lineStyle === "dashed" ? [10, 6] : undefined;

  return (
    <>
      <Arrow
        points={points}
        stroke={a.style.borderColor}
        strokeWidth={a.style.borderWidth}
        fill={a.style.borderColor}
        pointerLength={headSize}
        pointerWidth={headSize}
        dash={dash}
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
        onDragEnd={(e) => {
          const dx = e.target.x();
          const dy = e.target.y();
          e.target.x(0);
          e.target.y(0);
          update(a.id, {
            arrow: {
              ...a.arrow!,
              startX: (a.arrow!.startX ?? points[0]) + dx,
              startY: (a.arrow!.startY ?? points[1]) + dy,
              endX: a.arrow!.endX + dx,
              endY: a.arrow!.endY + dy,
            },
          });
        }}
      />
      {isSelected && (
        <Arrow
          points={points}
          stroke="#1e90ff"
          strokeWidth={1}
          fill="#1e90ff"
          pointerLength={headSize}
          pointerWidth={headSize}
          dash={[4, 4]}
          listening={false}
        />
      )}
    </>
  );
}
