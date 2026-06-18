import { Ellipse, Rect } from "react-konva";
import { useEditorStore } from "../../store/editorStore";
import type { Annotation } from "../../types/annotation";

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
  const shape = a.shape ?? "rect";

  const selectionBox = isSelected ? (
    <Rect
      x={a.rect.x - 4}
      y={a.rect.y - 4}
      width={a.rect.width + 8}
      height={a.rect.height + 8}
      stroke="#1e90ff"
      strokeWidth={1}
      dash={[4, 4]}
      listening={false}
    />
  ) : null;

  if (shape === "ellipse") {
    return (
      <>
        <Ellipse
          x={a.rect.x + a.rect.width / 2}
          y={a.rect.y + a.rect.height / 2}
          radiusX={a.rect.width / 2}
          radiusY={a.rect.height / 2}
          stroke={a.style.borderColor}
          strokeWidth={a.style.borderWidth}
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
            const node = e.target;
            update(a.id, { rect: { ...a.rect!, x: node.x() - a.rect!.width / 2, y: node.y() - a.rect!.height / 2 } });
          }}
        />
        {selectionBox}
      </>
    );
  }

  return (
    <>
      <Rect
        x={a.rect.x}
        y={a.rect.y}
        width={a.rect.width}
        height={a.rect.height}
        stroke={a.style.borderColor}
        strokeWidth={a.style.borderWidth}
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
          const node = e.target;
          update(a.id, { rect: { ...a.rect!, x: node.x(), y: node.y() } });
        }}
      />
      {selectionBox}
    </>
  );
}
