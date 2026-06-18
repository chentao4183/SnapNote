import { useRef } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Arrow, Ellipse } from "react-konva";
import type Konva from "konva";
import useImage from "use-image";
import { useEditorStore } from "../store/editorStore";
import AnnotationLayer from "./layers/AnnotationLayer";
import type { ActiveTool } from "../tools";
import { setEditorStage } from "./exportCanvas";
import type { Annotation } from "../types/annotation";

interface Props {
  active: ActiveTool;
  onEditText?: (a: Annotation, x: number, y: number) => void;
}

export default function EditorStage({ active, onEditText }: Props) {
  const bg = useEditorStore((s) => s.sourceImage);
  const crop = useEditorStore((s) => s.cropRegion);
  const [image] = useImage(bg);
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
        {/* Background is the full screenshot. Tools operate in screen/source
            coordinates, while cropRegion controls clipping, shade, and export. */}
        <KonvaImage image={image} x={0} y={0} width={window.innerWidth} height={window.innerHeight} />
      </Layer>
      <AnnotationLayer selectable onEditText={onEditText} crop={crop} />
      {/* Preview layer for in-progress annotations */}
      <Layer listening={false} clipX={crop.x} clipY={crop.y} clipWidth={crop.width} clipHeight={crop.height}>
        {active.kind === "smart" &&
          active.smart.previewRect &&
          renderBounds(active.smart.previewRect, active.smart.shape, active.smart.style.color, active.smart.style.strokeWidth)}
        {active.kind === "smart" &&
          !active.smart.previewRect &&
          active.smart.rect &&
          renderBounds(active.smart.rect, active.smart.shape, active.smart.style.color, active.smart.style.strokeWidth)}
        {active.kind === "smart" && active.smart.arrowStart && active.smart.arrowEnd && (
          <Arrow
            points={[
              active.smart.arrowStart.x,
              active.smart.arrowStart.y,
              active.smart.arrowEnd.x,
              active.smart.arrowEnd.y,
            ]}
            stroke={active.smart.style.color}
            strokeWidth={active.smart.style.strokeWidth}
            fill={active.smart.style.color}
            pointerLength={10}
            pointerWidth={10}
          />
        )}
        {active.kind === "rect" && active.rect.preview && (
          renderBounds(active.rect.preview, active.rect.shape, active.rect.style.color, active.rect.style.strokeWidth)
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
            stroke={active.arrow.style.color}
            strokeWidth={active.arrow.style.strokeWidth}
            fill={active.arrow.style.color}
            pointerLength={active.arrow.style.arrowHeadSize}
            pointerWidth={active.arrow.style.arrowHeadSize}
            dash={active.arrow.style.lineStyle === "dashed" ? [10, 6] : undefined}
          />
        )}
      </Layer>
    </Stage>
  );
}

function renderBounds(
  rect: { x: number; y: number; width: number; height: number },
  shape: "rect" | "ellipse",
  color: string,
  strokeWidth: number,
) {
  if (shape === "ellipse") {
    return (
      <Ellipse
        x={rect.x + rect.width / 2}
        y={rect.y + rect.height / 2}
        radiusX={rect.width / 2}
        radiusY={rect.height / 2}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    );
  }
  return <Rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} stroke={color} strokeWidth={strokeWidth} />;
}
