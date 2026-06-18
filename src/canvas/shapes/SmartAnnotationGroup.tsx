import { Arrow, Ellipse, Group, Rect } from "react-konva";
import { connectorBetweenShapeAndLabel } from "../../geometry/connector";
import { cornerPoint } from "../../geometry/corners";
import { labelBoxPosition, labelSide } from "../../geometry/labelBox";
import { useEditorStore } from "../../store/editorStore";
import type { Annotation } from "../../types/annotation";
import { labelBoxSize } from "../labelMetrics";
import TextLabelShape from "./TextLabelShape";

interface Props {
  a: Annotation;
  selectable?: boolean;
  onEditText?: (a: Annotation, x: number, y: number) => void;
}

export default function SmartAnnotationGroup({ a, selectable = false, onEditText }: Props) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.selectAnnotation);
  const update = useEditorStore((s) => s.updateAnnotation);
  const isSelected = selectable && selectedId === a.id;

  const start =
    a.arrow?.startX !== undefined && a.arrow?.startY !== undefined
      ? { x: a.arrow.startX, y: a.arrow.startY }
      : a.rect && a.arrow?.startCorner
        ? cornerPoint(a.rect, a.arrow.startCorner)
        : null;
  const smartConnector = smartLabelConnector();
  const headSize = a.arrowHeadSize ?? 10;

  return (
    <Group
      listening={selectable}
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
        e.cancelBubble = true;
        if (selectable && onEditText && a.arrow) {
          const stage = e.target.getStage();
          const pos = stage?.getPointerPosition();
          onEditText(a, pos?.x ?? a.arrow.endX, pos?.y ?? a.arrow.endY);
        }
      }}
    >
      {a.rect && renderBoundary()}
      {a.arrow && (smartConnector || start) && (
        <Arrow
          points={
            smartConnector
              ? [smartConnector.start.x, smartConnector.start.y, smartConnector.end.x, smartConnector.end.y]
              : [start!.x, start!.y, a.arrow.endX, a.arrow.endY]
          }
          stroke={a.style.borderColor}
          strokeWidth={a.style.borderWidth}
          fill={a.style.borderColor}
          pointerLength={headSize}
          pointerWidth={headSize}
          dash={a.lineStyle === "dashed" ? [10, 6] : undefined}
          listening={false}
        />
      )}
      <TextLabelShape a={a} selectable={selectable} onEditText={onEditText} />

      {isSelected && a.rect && (
        <>
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
          <Rect
            x={a.rect.x}
            y={a.rect.y}
            width={a.rect.width}
            height={a.rect.height}
            fill="rgba(0,0,0,0.001)"
            draggable
            onDragEnd={(e) => {
              const dx = e.target.x();
              const dy = e.target.y();
              e.target.x(0);
              e.target.y(0);
              moveWholeAnnotation(dx, dy);
            }}
          />
        </>
      )}
    </Group>
  );

  function renderBoundary() {
    if (!a.rect) return null;
    if ((a.shape ?? "rect") === "ellipse") {
      return (
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
            const dx = e.target.x() - (a.rect!.x + a.rect!.width / 2);
            const dy = e.target.y() - (a.rect!.y + a.rect!.height / 2);
            moveWholeAnnotation(dx, dy);
          }}
        />
      );
    }

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
          const dx = e.target.x() - a.rect!.x;
          const dy = e.target.y() - a.rect!.y;
          moveWholeAnnotation(dx, dy);
        }}
      />
    );
  }

  function smartLabelConnector() {
    if (!a.rect || !a.arrow || a.note === undefined || a.note.trim() === "") return null;
    const labelX = a.arrow.labelX ?? a.arrow.endX;
    const labelY = a.arrow.labelY ?? a.arrow.endY;
    const boxSize = labelBoxSize(a.note, a.style, a.fontFamily);
    const box = labelBoxPosition({ x: labelX, y: labelY }, labelSide({ x: labelX, y: labelY }, a.rect), boxSize.width, boxSize.height);
    return connectorBetweenShapeAndLabel(a.shape ?? "rect", a.rect, {
      x: box.boxX,
      y: box.boxY,
      width: boxSize.width,
      height: boxSize.height,
    });
  }

  function moveWholeAnnotation(dx: number, dy: number) {
    update(a.id, {
      rect: a.rect
        ? { x: a.rect.x + dx, y: a.rect.y + dy, width: a.rect.width, height: a.rect.height }
        : a.rect,
      arrow: a.arrow
        ? {
            ...a.arrow,
            startX: a.arrow.startX === undefined ? a.arrow.startX : a.arrow.startX + dx,
            startY: a.arrow.startY === undefined ? a.arrow.startY : a.arrow.startY + dy,
            endX: a.arrow.endX + dx,
            endY: a.arrow.endY + dy,
            labelX: (a.arrow.labelX ?? a.arrow.endX) + dx,
            labelY: (a.arrow.labelY ?? a.arrow.endY) + dy,
          }
        : a.arrow,
    });
  }
}
