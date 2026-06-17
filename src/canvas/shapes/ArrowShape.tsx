import { Arrow } from "react-konva";
import type { Annotation } from "../../types/annotation";
import { useEditorStore } from "../../store/editorStore";

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

  return (
    <Arrow
      points={points}
      stroke={a.style.borderColor}
      strokeWidth={a.style.borderWidth}
      fill={a.style.borderColor}
      pointerLength={10}
      pointerWidth={10}
      listening={selectable}
      draggable={isSelected}
      onClick={() => selectable && select(a.id)}
      onTap={() => selectable && select(a.id)}
      onDragEnd={(e) => {
        // Translate both endpoints by the drag delta.
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
      shadowEnabled={isSelected}
      shadowColor="#00d2ff"
      shadowBlur={10}
      shadowOpacity={0.9}
    />
  );
}
