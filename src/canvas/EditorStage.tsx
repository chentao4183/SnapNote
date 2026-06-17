import { useRef } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Arrow } from "react-konva";
import type Konva from "konva";
import useImage from "use-image";
import { useEditorStore } from "../store/editorStore";
import AnnotationLayer from "./layers/AnnotationLayer";
import { useActiveTool } from "../tools";
import { cornerPoint } from "../geometry/corners";
import { setEditorStage } from "./exportCanvas";
import type { Annotation } from "../types/annotation";

interface Props {
  onEditText?: (a: Annotation, x: number, y: number) => void;
}

export default function EditorStage({ onEditText }: Props) {
  const bg = useEditorStore((s) => s.backgroundImage);
  const rect = useEditorStore((s) => s.selectionRect);
  const [image] = useImage(bg);
  const active = useActiveTool();
  const stageRef = useRef<Konva.Stage>(null);

  // Attach only the active tool's handlers (discriminated by `active.kind`).
  const handlers =
    active.kind === "smart"
      ? active.smart.handlers
      : active.kind === "rect"
        ? active.rect.handlers
        : active.kind === "arrow"
          ? active.arrow.handlers
          : active.kind === "mosaic"
            ? active.mosaic.handlers
            : active.kind === "text"
              ? active.text.handlers
              : {};

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      {...handlers}
      ref={(node) => {
        stageRef.current = node;
        setEditorStage(node);
      }}
    >
      <Layer>
        <KonvaImage image={image} x={rect.x} y={rect.y} width={rect.width} height={rect.height} />
      </Layer>
      <AnnotationLayer selectable={active.kind === "select"} onEditText={onEditText} />
      {/* Preview layer for in-progress annotations */}
      <Layer listening={false}>
        {active.kind === "smart" && active.smart.previewRect && (
          <Rect
            x={active.smart.previewRect.x}
            y={active.smart.previewRect.y}
            width={active.smart.previewRect.width}
            height={active.smart.previewRect.height}
            stroke="#ff4757"
            strokeWidth={3}
          />
        )}
        {active.kind === "smart" && active.smart.rect && active.smart.arrowEnd && (
          <Arrow
            points={[
              cornerPoint(active.smart.rect, active.smart.startCorner).x,
              cornerPoint(active.smart.rect, active.smart.startCorner).y,
              active.smart.arrowEnd.x,
              active.smart.arrowEnd.y,
            ]}
            stroke="#ff4757"
            strokeWidth={3}
            fill="#ff4757"
            pointerLength={10}
            pointerWidth={10}
          />
        )}
        {active.kind === "rect" && active.rect.preview && (
          <Rect
            x={active.rect.preview.x}
            y={active.rect.preview.y}
            width={active.rect.preview.width}
            height={active.rect.preview.height}
            stroke="#ff4757"
            strokeWidth={3}
          />
        )}
        {active.kind === "mosaic" && active.mosaic.preview && (
          <Rect
            x={active.mosaic.preview.x}
            y={active.mosaic.preview.y}
            width={active.mosaic.preview.width}
            height={active.mosaic.preview.height}
            stroke="#7bed9f"
            strokeWidth={2}
            dash={[5, 5]}
          />
        )}
        {active.kind === "arrow" && active.arrow.preview && (
          <Arrow
            points={[active.arrow.preview.sx, active.arrow.preview.sy, active.arrow.preview.ex, active.arrow.preview.ey]}
            stroke="#ff4757"
            strokeWidth={3}
            fill="#ff4757"
            pointerLength={10}
            pointerWidth={10}
          />
        )}
      </Layer>
    </Stage>
  );
}
