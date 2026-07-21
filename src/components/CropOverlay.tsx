import { useRef } from "react";
import { resizeCropFromHandle, type CropHandle } from "../geometry/crop";
import { useEditorStore } from "../store/editorStore";
import type { Rect } from "../types/annotation";

const HANDLE_SIZE = 9;

const HANDLES: Array<{ id: CropHandle; cursor: string; x: (r: Rect) => number; y: (r: Rect) => number }> = [
  { id: "nw", cursor: "nwse-resize", x: (r) => r.x, y: (r) => r.y },
  { id: "n", cursor: "ns-resize", x: (r) => r.x + r.width / 2, y: (r) => r.y },
  { id: "ne", cursor: "nesw-resize", x: (r) => r.x + r.width, y: (r) => r.y },
  { id: "e", cursor: "ew-resize", x: (r) => r.x + r.width, y: (r) => r.y + r.height / 2 },
  { id: "se", cursor: "nwse-resize", x: (r) => r.x + r.width, y: (r) => r.y + r.height },
  { id: "s", cursor: "ns-resize", x: (r) => r.x + r.width / 2, y: (r) => r.y + r.height },
  { id: "sw", cursor: "nesw-resize", x: (r) => r.x, y: (r) => r.y + r.height },
  { id: "w", cursor: "ew-resize", x: (r) => r.x, y: (r) => r.y + r.height / 2 },
];

export default function CropOverlay() {
  const crop = useEditorStore((s) => s.cropRegion);
  const sourceWidth = useEditorStore((s) => s.sourceWidth);
  const sourceHeight = useEditorStore((s) => s.sourceHeight);
  const setCropRegion = useEditorStore((s) => s.setCropRegion);
  const beginCropChange = useEditorStore((s) => s.beginCropChange);
  const dragRef = useRef<{ handle: CropHandle; start: { x: number; y: number }; crop: Rect } | null>(null);

  function startDrag(handle: CropHandle, e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    beginCropChange();
    dragRef.current = { handle, start: { x: e.clientX, y: e.clientY }, crop };

    const onMove = (event: MouseEvent) => {
      if (!dragRef.current) return;
      const drag = dragRef.current;
      setCropRegion(
        resizeCropFromHandle(
          drag.crop,
          drag.handle,
          { x: event.clientX - drag.start.x, y: event.clientY - drag.start.y },
          { width: sourceWidth, height: sourceHeight },
        ),
      );
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // Keep in sync with SelectorWindow.tsx (F1 select-stage mask) so the dim
  // color doesn't shift between region selection and editor crop overlay.
  const shade = "rgba(0, 0, 0, 0.45)";
  const commonShade: React.CSSProperties = {
    position: "absolute",
    background: shade,
    pointerEvents: "none",
    zIndex: 20,
  };

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 30 }}>
      <div style={{ ...commonShade, left: 0, top: 0, width: sourceWidth, height: Math.max(0, crop.y) }} />
      <div
        style={{
          ...commonShade,
          left: 0,
          top: crop.y + crop.height,
          width: sourceWidth,
          height: Math.max(0, sourceHeight - (crop.y + crop.height)),
        }}
      />
      <div style={{ ...commonShade, left: 0, top: crop.y, width: Math.max(0, crop.x), height: crop.height }} />
      <div
        style={{
          ...commonShade,
          left: crop.x + crop.width,
          top: crop.y,
          width: Math.max(0, sourceWidth - (crop.x + crop.width)),
          height: crop.height,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: crop.x,
          top: crop.y,
          width: crop.width,
          height: crop.height,
          border: "2px solid #1e90ff",
          boxSizing: "border-box",
          pointerEvents: "none",
          zIndex: 35,
        }}
      />
      {HANDLES.map((handle) => (
        <div
          key={handle.id}
          onMouseDown={(e) => startDrag(handle.id, e)}
          style={{
            position: "absolute",
            left: handle.x(crop) - HANDLE_SIZE / 2,
            top: handle.y(crop) - HANDLE_SIZE / 2,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            background: "#fff",
            border: "2px solid #1e90ff",
            boxSizing: "border-box",
            borderRadius: 2,
            cursor: handle.cursor,
            pointerEvents: "auto",
            zIndex: 40,
          }}
        />
      ))}
    </div>
  );
}
