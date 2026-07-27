import { useRef } from "react";
import { Stage, Layer, Rect, Arrow, Ellipse } from "react-konva";
import type Konva from "konva";
import { useEditorStore } from "../store/editorStore";
import { arrowHeadFromStroke } from "../geometry/arrowHead";
import AnnotationLayer from "./layers/AnnotationLayer";
import type { ActiveTool } from "../tools";
import { setEditorStage } from "./exportCanvas";
import type { Annotation, ShapeKind } from "../types/annotation";

interface Props {
  active: ActiveTool;
  onEditText?: (a: Annotation, x: number, y: number) => void;
}

export default function EditorStage({ active, onEditText }: Props) {
  const bg = useEditorStore((s) => s.sourceImage);
  const crop = useEditorStore((s) => s.cropRegion);
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
    <div style={{ position: "relative", width: window.innerWidth, height: window.innerHeight }}>
      {/* Background screenshot is rendered as a DOM <img>, NOT a Konva node.
          The screenshot is captured at physical pixels (xcap native), but a
          Konva <Image> forced to width={innerWidth} (logical px) gets resampled
          by canvas drawImage under non-integer DPR (125%/150%), which destroys
          ClearType subpixel detail and makes text look blurry/colored. A DOM
          <img> uses Chromium's high-quality scaler and stays crisp. The Konva
          Stage overlays transparently on top for annotations only. */}
      <img
        src={bg}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          userSelect: "none",
          // Hint the browser to preserve sharpness when scaling the screenshot
          // to the logical window size.
          imageRendering: "-webkit-optimize-contrast",
        }}
      />
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        {...handlers}
        ref={(node) => {
          stageRef.current = node;
          setEditorStage(node);
        }}
      >
        <AnnotationLayer selectable onEditText={onEditText} crop={crop} />
        {/* Preview layer for in-progress annotations */}
        <Layer listening={false} clipX={crop.x} clipY={crop.y} clipWidth={crop.width} clipHeight={crop.height}>
          {active.kind === "smart" &&
            active.smart.previewRect &&
            active.smart.shape !== "none" &&
            renderBounds(active.smart.previewRect, active.smart.shape, active.smart.style.color, active.smart.style.strokeWidth)}
          {active.kind === "smart" &&
            !active.smart.previewRect &&
            active.smart.rect &&
            active.smart.shape !== "none" &&
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
              pointerLength={arrowHeadFromStroke(active.arrow.style.strokeWidth)}
              pointerWidth={arrowHeadFromStroke(active.arrow.style.strokeWidth)}
              dash={active.arrow.style.lineStyle === "dashed" ? [10, 6] : undefined}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}

function renderBounds(
  rect: { x: number; y: number; width: number; height: number },
  shape: ShapeKind,
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
