import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize, LogicalPosition } from "@tauri-apps/api/window";
import { copyImageToClipboard, saveImage, type PinLoadPayload } from "../ipc/bridge";
import { clampScale, scaleAroundCenter, scaleFromCornerDrag } from "../canvas/pinGeometry";

/**
 * A Snipaste-style pinned screenshot window: borderless, always-on-top,
 * transparent, and not in the taskbar. The window opens at the image's 1:1
 * size and can be:
 *   - moved by dragging anywhere on the image
 *   - scaled by the mouse wheel (anchored at the window center)
 *   - scaled by dragging the bottom-right handle (aspect-locked)
 *   - closed via the top-right × button or Esc
 *   - copied/saved via Ctrl+C / Ctrl+S
 *
 * The image data URL is delivered via the `pin-load` event emitted right
 * before this window is shown (see createPinWindow in bridge.ts).
 */
export default function PinWindow() {
  const [payload, setPayload] = useState<PinLoadPayload | null>(null);
  const [hovered, setHovered] = useState(false);
  const [closing, setClosing] = useState(false);

  // scale is relative to the image's 1:1 logical size. We track it here and
  // mirror it into the physical window size via setSize + setPosition so the
  // OS-level window bounds follow our scale exactly.
  const scaleRef = useRef(1);
  const baseSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const dataUrl = payload?.dataUrl ?? "";

  // Receive the payload from the editor window.
  useEffect(() => {
    const unlisten = listen<PinLoadPayload>("pin-load", (event) => {
      baseSizeRef.current = { width: event.payload.width, height: event.payload.height };
      scaleRef.current = 1;
      setPayload(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Apply scaleRef to the physical window, keeping the center point fixed.
  // All math is done in physical pixels (outerPosition/outerSize return
  // physical units); the final setSize/setPosition calls convert to logical.
  //
  // We keep this in a ref whose .current is reassigned every render so the
  // latest scaleRef/baseSizeRef values are read inside, while preserving a
  // stable function identity for the wheel/corner handlers that close over it.
  const applyScale = useRef<() => Promise<void>>(async () => {});
  applyScale.current = async () => {
    const win = getCurrentWebviewWindow();
    const factor = await win.scaleFactor().catch(() => 1);
    const pos = await win.outerPosition();
    const size = await win.outerSize();
    const base = baseSizeRef.current;
    // Anchor on the current center; the pure helper handles the geometry.
    // prevScale is the physical->base ratio so scaleAroundCenter can recover
    // the base size from the current physical rect.
    const prevScale = (size.width || 1) / (base.width || 1);
    const next = scaleAroundCenter(
      { x: pos.x, y: pos.y, width: size.width, height: size.height },
      scaleRef.current,
      prevScale,
    );
    await win.setSize(new LogicalSize(next.width / factor, next.height / factor));
    await win.setPosition(new LogicalPosition(next.x / factor, next.y / factor));
  };

  // Wheel scaling, rAF-throttled so rapid wheel events coalesce.
  useEffect(() => {
    if (!payload) return;
    let scheduled = false;
    let pendingScale = scaleRef.current;

    function flush() {
      scheduled = false;
      if (Math.abs(pendingScale - scaleRef.current) < 1e-4) return;
      scaleRef.current = pendingScale;
      void applyScale.current();
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      pendingScale = clampScale(pendingScale * factor);
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(flush);
      }
    }

    // passive:false so we can preventDefault to stop the page from scrolling.
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [payload]);

  // Drag-move via the Tauri start-dragging primitive.
  function onImagePointerDown(e: ReactPointerEvent<HTMLImageElement>) {
    if (e.button !== 0) return;
    void getCurrentWebviewWindow().startDragging();
  }

  // Corner-handle drag to scale (aspect-locked).
  const cornerDragRef = useRef<{
    startPointer: { x: number; y: number };
    startScale: number;
  } | null>(null);

  function onCornerPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.stopPropagation();
    cornerDragRef.current = {
      startPointer: { x: e.clientX, y: e.clientY },
      startScale: scaleRef.current,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onCornerPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = cornerDragRef.current;
    if (!drag) return;
    const next = scaleFromCornerDrag(
      baseSizeRef.current,
      drag.startPointer,
      { x: e.clientX, y: e.clientY },
      drag.startScale,
    );
    if (Math.abs(next - scaleRef.current) > 1e-4) {
      scaleRef.current = next;
      void applyScale.current();
    }
  }

  function onCornerPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    cornerDragRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  // Close + shortcuts.
  async function close() {
    if (closing) return;
    setClosing(true);
    try {
      await getCurrentWebviewWindow().close();
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!payload) return;
    async function onKey(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") {
        e.preventDefault();
        await close();
        return;
      }
      if (ctrl && e.key.toLowerCase() === "c") {
        e.preventDefault();
        try {
          await copyImageToClipboard(dataUrl);
        } catch (err) {
          alert(`复制失败：${err instanceof Error ? err.message : String(err)}`);
        }
      } else if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        try {
          const { save } = await import("@tauri-apps/plugin-dialog");
          const path = await save({
            defaultPath: `stepmark-pin-${Date.now()}.png`,
            filters: [{ name: "PNG", extensions: ["png"] }],
          });
          if (path) await saveImage(dataUrl, path, "png");
        } catch (err) {
          alert(`保存失败：${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, dataUrl]);

  if (!payload) {
    return <div style={loadingStyle} />;
  }

  const closeBtnOpacity = hovered ? 0.85 : 0;
  const handleOpacity = hovered ? 0.85 : 0;
  const borderColor = hovered ? "rgba(23,131,255,0.9)" : "transparent";

  return (
    <div
      style={{ ...rootStyle, border: `1px solid ${borderColor}` }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <img
        src={dataUrl}
        alt=""
        draggable={false}
        style={imageStyle}
        onPointerDown={onImagePointerDown}
      />
      {/* Close button (top-right). Hidden until hover. */}
      <button
        type="button"
        title="关闭 (Esc)"
        onClick={() => void close()}
        style={{ ...closeBtnStyle, opacity: closeBtnOpacity }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <CloseIcon />
      </button>
      {/* Resize handle (bottom-right). Hidden until hover. */}
      <div
        title="拖拽缩放"
        style={{ ...cornerHandleStyle, opacity: handleOpacity }}
        onPointerDown={onCornerPointerDown}
        onPointerMove={onCornerPointerMove}
        onPointerUp={onCornerPointerUp}
      />
    </div>
  );
}

// ---- styles ----

const rootStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  width: "100vw",
  height: "100vh",
  // Almost-transparent background so the transparent window still receives
  // pointer events across its full area (pure transparency can let clicks
  // pass through on Windows).
  background: "rgba(0,0,0,0.01)",
  boxSizing: "border-box",
  userSelect: "none",
  cursor: "default",
};

const imageStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  // The image is the drag handle, so it needs an explicit grab cursor.
  cursor: "grab",
  pointerEvents: "auto",
};

const closeBtnStyle: CSSProperties = {
  position: "absolute",
  top: 4,
  right: 4,
  width: 18,
  height: 18,
  border: "none",
  borderRadius: 9,
  background: "rgba(23,131,255,0.9)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  transition: "opacity 0.12s",
};

const cornerHandleStyle: CSSProperties = {
  position: "absolute",
  right: 0,
  bottom: 0,
  width: 14,
  height: 14,
  background: "rgba(23,131,255,0.9)",
  cursor: "nwse-resize",
  transition: "opacity 0.12s",
  borderTopLeftRadius: 2,
};

const loadingStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
  background: "transparent",
};

function CloseIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
    >
      <path d="M5 5 19 19" />
      <path d="M19 5 5 19" />
    </svg>
  );
}
