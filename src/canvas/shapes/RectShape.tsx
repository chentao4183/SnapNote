import { Rect } from "react-konva";
import type { Annotation } from "../../types/annotation";
import { useEditorStore } from "../../store/editorStore";

interface Props {
  a: Annotation;
  selectable?: boolean;
}

export default function RectShape({ a, selectable = false }: Props) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.selectAnnotation);
  const update = useEditorStore((s) => s.updateAnnotation);
  const isSelected = selectable && selectedId === a.id;

  if (!a.rect) return null;
  return (
    <Rect
      x={a.rect.x}
      y={a.rect.y}
      width={a.rect.width}
      height={a.rect.height}
      stroke={a.style.borderColor}
      strokeWidth={a.style.borderWidth}
      listening={selectable}
      draggable={isSelected}
      onClick={() => selectable && select(a.id)}
      onTap={() => selectable && select(a.id)}
      onDragEnd={(e) => {
        const node = e.target;
        update(a.id, { rect: { ...a.rect!, x: node.x(), y: node.y() } });
      }}
      shadowEnabled={isSelected}
      shadowColor="#00d2ff"
      shadowBlur={10}
      shadowOpacity={0.9}
    />
  );
}
