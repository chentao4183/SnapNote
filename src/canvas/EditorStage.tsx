import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { useEditorStore } from "../store/editorStore";

export default function EditorStage() {
  const bg = useEditorStore((s) => s.backgroundImage);
  const rect = useEditorStore((s) => s.selectionRect);
  const [image] = useImage(bg);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <KonvaImage image={image} x={rect.x} y={rect.y} width={rect.width} height={rect.height} />
      </Layer>
    </Stage>
  );
}
