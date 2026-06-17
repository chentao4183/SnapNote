import { Stage, Layer, Image as KonvaImage, Rect, Arrow } from "react-konva";
import useImage from "use-image";
import { useEditorStore } from "../store/editorStore";
import AnnotationLayer from "./layers/AnnotationLayer";
import { useSmartAnnotationTool } from "../tools/useSmartAnnotationTool";
import { cornerPoint } from "../geometry/corners";

export default function EditorStage() {
  const bg = useEditorStore((s) => s.backgroundImage);
  const rect = useEditorStore((s) => s.selectionRect);
  const tool = useEditorStore((s) => s.currentTool);
  const [image] = useImage(bg);
  const smart = useSmartAnnotationTool();

  const activeHandlers = tool === "smart" ? smart.handlers : {};

  return (
    <Stage width={window.innerWidth} height={window.innerHeight} {...activeHandlers}>
      <Layer>
        <KonvaImage image={image} x={rect.x} y={rect.y} width={rect.width} height={rect.height} />
      </Layer>
      <AnnotationLayer />
      {/* Preview layer for the in-progress smart annotation */}
      {tool === "smart" && (
        <Layer listening={false}>
          {smart.previewRect && (
            <Rect
              x={smart.previewRect.x}
              y={smart.previewRect.y}
              width={smart.previewRect.width}
              height={smart.previewRect.height}
              stroke="#ff4757"
              strokeWidth={3}
            />
          )}
          {smart.rect && smart.arrowEnd && (
            <Arrow
              points={[
                cornerPoint(smart.rect, smart.startCorner).x,
                cornerPoint(smart.rect, smart.startCorner).y,
                smart.arrowEnd.x,
                smart.arrowEnd.y,
              ]}
              stroke="#ff4757"
              strokeWidth={3}
              fill="#ff4757"
              pointerLength={10}
              pointerWidth={10}
            />
          )}
        </Layer>
      )}
    </Stage>
  );
}
