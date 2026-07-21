import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { listen, emit } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/window";
import { copyImageToClipboard, saveImage, type PinLoadPayload } from "../ipc/bridge";
import { clampScale, scaleFromCornerDrag } from "../canvas/pinGeometry";

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
  // We register the listener BEFORE emitting pin-ready, so by the time the
  // creator (createPinWindow in bridge.ts) sees our ready signal and sends
  // pin-load, this listener is guaranteed to be subscribed.
  useEffect(() => {
    let cancelled = false;
    const unlistenPromise = listen<PinLoadPayload>("pin-load", (event) => {
      if (cancelled) return;
      baseSizeRef.current = { width: event.payload.width, height: event.payload.height };
      scaleRef.current = 1;
      setPayload(event.payload);
    });
    // Signal readiness so the creator emits pin-load. The event name is
    // scoped to this window's label to avoid cross-talk between pins.
    void (async () => {
      const label = getCurrentWebviewWindow().label;
      await emit(`pin-ready-${label}`);
    })();
    return () => {
      cancelled = true;
      void unlistenPromise.then((fn) => fn());
    };
  }, []);

  // Scale factor is constant for a window's lifetime on a single monitor;
  // cache it after the payload arrives so the per-wheel-tick resize doesn't
  // pay an IPC round-trip for it. (Windows locks the factor at creation.)
  const scaleFactorRef = useRef(1);
  useEffect(() => {
    if (!payload) return;
    void getCurrentWebviewWindow()
      .scaleFactor()
      .then((f) => {
        scaleFactorRef.current = f;
      })
      .catch(() => {
        /* keep default 1 */
      });
  }, [payload]);

  // Signal the creator once the <img> has actually decoded, so it can show
  // the window only after pixels are on screen — otherwise win.show() races
  // ahead of the decode and the pin briefly appears blank.
  const renderedRef = useRef(false);
  function onImageLoad() {
    if (renderedRef.current) return;
    renderedRef.current = true;
    void (async () => {
      const label = getCurrentWebviewWindow().label;
      await emit(`pin-rendered-${label}`);
    })();
  }

  // Apply scaleRef to the physical window, anchored at the TOP-LEFT corner.
  // Because the anchor is the top-left, we only need to setSize — the window's
  // position stays fixed, so we skip the outerPosition/outerSize IPC calls
  // that the previous center-anchored version needed. That keeps each wheel
  // tick down to a single setSize IPC, which is what makes wheel zoom feel
  // responsive instead of laggy.
  const applyScale = useRef<() => Promise<void>>(async () => {});
  applyScale.current = async () => {
    const win = getCurrentWebviewWindow();
    const base = baseSizeRef.current;
    const w = Math.max(1, Math.round(base.width * scaleRef.current));
    const h = Math.max(1, Math.round(base.height * scaleRef.current));
    await win.setSize(new LogicalSize(w, h));
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
        onLoad={onImageLoad}
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
