import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import useImage from "use-image";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { captureScreen, hideCurrentWindow } from "../ipc/bridge";
import { useEditorStore } from "../store/editorStore";
import EditorView from "../components/EditorView";
import type { Selection } from "../types/annotation";

type Mode = "selecting" | "editing";

export default function SelectorWindow() {
  const [bg, setBg] = useState<string>("");
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [mode, setMode] = useState<Mode>("selecting");
  // Mirror mode into a ref so the window-level event listeners (subscribed once)
  // always read the latest value without needing to re-subscribe on every change.
  // Re-subscribing on mode change was re-running recapture() and wiping the edit.
  const modeRef = useRef<Mode>("selecting");
  const setModeSync = (m: Mode) => {
    modeRef.current = m;
    setMode(m);
  };

  const [image] = useImage(bg);
  const initEditor = useEditorStore((s) => s.init);
  const setTool = useEditorStore((s) => s.setTool);

  // Mount once: recapture, and subscribe keydown/focus. These listeners read
  // modeRef.current so they don't need [mode] in deps (which caused the wipe bug).
  useEffect(() => {
    let mounted = true;
    async function recapture() {
      const dataUrl = await captureScreen();
      if (mounted && modeRef.current === "selecting") {
        setBg(dataUrl);
        setSelection(null);
        startRef.current = null;
      }
    }
    recapture();

    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (modeRef.current === "editing") {
        // Exit edit but keep the window up for a new selection.
        setModeSync("selecting");
        setSelection(null);
        startRef.current = null;
        recapture();
      } else {
        hideCurrentWindow();
      }
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);

    const win = getCurrentWebviewWindow();
    const unlistenFocus = win.onFocusChanged(({ payload: focused }) => {
      if (focused && modeRef.current === "selecting") recapture();
    });

    return () => {
      mounted = false;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      unlistenFocus.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- selecting-mode mouse handlers ----
  function onMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (mode !== "selecting") return;
    const pos = e.target.getStage()!.getPointerPosition()!;
    startRef.current = pos;
    setSelection({ x: pos.x, y: pos.y, width: 0, height: 0 });
  }

  function onMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (mode !== "selecting" || !startRef.current) return;
    const pos = e.target.getStage()!.getPointerPosition()!;
    const s = startRef.current;
    setSelection({
      x: Math.min(s.x, pos.x),
      y: Math.min(s.y, pos.y),
      width: Math.abs(pos.x - s.x),
      height: Math.abs(pos.y - s.y),
    });
  }

  function onMouseUp() {
    if (mode !== "selecting" || !selection) return;
    if (selection.width < 5 || selection.height < 5) {
      hideCurrentWindow();
      return;
    }
    // Switch to in-place editing: keep the full screenshot as background, edit
    // in screen coordinates so the canvas sits exactly over the selection.
    initEditor(bg, selection);
    setTool("smart");
    setModeSync("editing");
  }

  // ---- editing mode ----
  if (mode === "editing" && selection) {
    return (
      <div style={{ position: "relative", width: size.width, height: size.height }}>
        {/* Dim everything outside the selection; the selection stays clear so the
            user edits "in place". */}
        <SelectionDimmer stageWidth={size.width} stageHeight={size.height} selection={selection} image={image} />
        {/* Editor body overlays the full window; EditorStage draws the background
            at full window size and tools operate in screen space. */}
        <div style={{ position: "absolute", inset: 0 }}>
          <EditorView onExit={() => setModeSync("selecting")} />
        </div>
      </div>
    );
  }

  // ---- selecting mode ----
  return (
    <Stage width={size.width} height={size.height} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <Layer>
        <KonvaImage image={image} x={0} y={0} width={size.width} height={size.height} listening={false} />
        <Rect x={0} y={0} width={size.width} height={size.height} fill="rgba(0,0,0,0.3)" listening={false} />
        {selection && (
          <Rect
            x={selection.x}
            y={selection.y}
            width={selection.width}
            height={selection.height}
            fill="rgba(0,0,0,0)"
            stroke="#ff4757"
            strokeWidth={2}
            dash={[6, 3]}
            listening={false}
          />
        )}
      </Layer>
    </Stage>
  );
}

/**
 * Draws the full screenshot with a dim overlay everywhere EXCEPT the selection
 * rect (a "hole"), implemented as four rects framing the hole.
 */
function SelectionDimmer({
  stageWidth,
  stageHeight,
  selection,
  image,
}: {
  stageWidth: number;
  stageHeight: number;
  selection: Selection;
  image: HTMLImageElement | undefined;
}) {
  const { x, y, width, height } = selection;
  const dim = "rgba(0,0,0,0.35)";
  return (
    <Stage width={stageWidth} height={stageHeight} style={{ position: "absolute", inset: 0 }}>
      <Layer listening={false}>
        <KonvaImage image={image} x={0} y={0} width={stageWidth} height={stageHeight} />
        <Rect x={0} y={0} width={stageWidth} height={Math.max(0, y)} fill={dim} />
        <Rect x={0} y={y + height} width={stageWidth} height={Math.max(0, stageHeight - (y + height))} fill={dim} />
        <Rect x={0} y={y} width={Math.max(0, x)} height={height} fill={dim} />
        <Rect x={x + width} y={y} width={Math.max(0, stageWidth - (x + width))} height={height} fill={dim} />
        <Rect x={x} y={y} width={width} height={height} stroke="#ff4757" strokeWidth={2} dash={[6, 3]} />
      </Layer>
    </Stage>
  );
}
