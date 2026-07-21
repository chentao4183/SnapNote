import { invoke } from "@tauri-apps/api/core";
import { listen, emitTo, type UnlistenFn } from "@tauri-apps/api/event";
import { currentMonitor } from "@tauri-apps/api/window";
import { WebviewWindow, getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

// ---- Commands ----

export async function captureScreen(): Promise<string> {
  return invoke<string>("capture_screen");
}

export async function copyImageToClipboard(dataUrl: string): Promise<void> {
  await invoke("copy_image_to_clipboard", { dataUrl });
}

export async function saveImage(dataUrl: string, path: string, format: "png" | "jpg"): Promise<void> {
  await invoke("save_image", { dataUrl, path, format });
}

// ---- Autostart ----

export async function getAutostart(): Promise<boolean> {
  return invoke<boolean>("get_autostart");
}

export async function setAutostart(enabled: boolean): Promise<void> {
  await invoke("set_autostart", { enabled });
}

// ---- Events ----

export function onScreenshotTriggered(cb: () => void): Promise<UnlistenFn> {
  return listen("screenshot-triggered", () => cb());
}

// ---- Window controls ----

/** Show and focus the selector window (called from the main window on F1). */
export async function showSelectorWindow(): Promise<void> {
  const selector = await WebviewWindow.getByLabel("selector");
  if (selector) {
    await selector.show();
    await selector.setFocus();
    await emitTo("selector", "selector-start", {});
  }
}

export async function hideCurrentWindow(): Promise<void> {
  await getCurrentWebviewWindow().hide();
}

export async function closeCurrentWindow(): Promise<void> {
  await getCurrentWebviewWindow().close();
}

/** Emit the selection + full screenshot to the editor window, then show it. */
export async function showEditorWindow(
  selectionData: { x: number; y: number; width: number; height: number; fullBase64: string },
): Promise<void> {
  const editor = await WebviewWindow.getByLabel("editor");
  if (editor) {
    // emitTo targets the editor window's webview explicitly (cross-window).
    await emitTo("editor", "editor-load", selectionData);
    await editor.show();
    await editor.setFocus();
  }
}

// ---- Pin-to-screen windows ----

/** Module-level counter so each pin window gets a unique label (pin-0, pin-1, ...). */
let pinCounter = 0;

export interface PinLoadPayload {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Create a new borderless, always-on-top, always-floating pin window showing
 * the given image data URL at 1:1 scale. Each call opens a fresh window, so
 * multiple pins can coexist on screen.
 *
 * `position` is the desired top-left in screen coordinates (typically the
 * crop region's origin, so the pin lands back where the screenshot was
 * taken). If omitted, the pin is centered on the primary monitor. In either
 * case the position is clamped to keep the whole window on-screen.
 *
 * Handshake: we don't emit `pin-load` on `tauri://created` because at that
 * point the webview's JS is still booting and its `listen("pin-load")` is not
 * registered yet — Tauri drops events with no subscribers, so the pin would
 * receive nothing and render as a blank transparent window. Instead we wait
 * for a `pin-ready` event that the PinWindow emits once its listener is
 * attached, then send the payload.
 */
export async function createPinWindow(
  dataUrl: string,
  width: number,
  height: number,
  position?: { x: number; y: number },
): Promise<WebviewWindow> {
  const label = `pin-${pinCounter++}`;

  // Clamp the requested position so the whole window stays on the screen.
  const { x, y } = await clampPositionToScreen(position, width, height);

  const win = new WebviewWindow(label, {
    url: "pin.html",
    title: "StepMark Pin",
    width,
    height,
    x,
    y,
    decorations: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    visible: false,
  });

  // Wait for the PinWindow to signal its listener is attached, then send the
  // payload. Timeout after 5s so a misbehaving window doesn't hang forever.
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      void unlistenPromise.then((fn) => fn());
      reject(new Error("pin window did not become ready in time"));
    }, 5000);

    const unlistenPromise = listen(`pin-ready-${label}`, () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void unlistenPromise.then((fn) => fn());
      resolve();
    });
  });

  await emitTo(label, "pin-load", { dataUrl, width, height } satisfies PinLoadPayload);
  await win.show();
  await win.setFocus();
  return win;
}

/**
 * Clamp a desired top-left so the window's full width/height stays inside the
 * current monitor's work area. If `position` is null, the window is centered
 * on the monitor instead.
 */
async function clampPositionToScreen(
  position: { x: number; y: number } | undefined,
  width: number,
  height: number,
): Promise<{ x: number; y: number }> {
  type Monitor = { size: { width: number; height: number }; position: { x: number; y: number } };
  let monitor: Monitor | null = null;
  try {
    const current = await currentMonitor();
    monitor = current && current.position && current.size ? (current as Monitor) : null;
  } catch {
    monitor = null;
  }

  const availW = monitor?.size.width ?? window.screen.availWidth;
  const availH = monitor?.size.height ?? window.screen.availHeight;
  const baseX = monitor?.position.x ?? 0;
  const baseY = monitor?.position.y ?? 0;

  let x: number;
  let y: number;
  if (position) {
    x = position.x;
    y = position.y;
  } else {
    x = baseX + Math.max(0, (availW - width) / 2);
    y = baseY + Math.max(0, (availH - height) / 2);
  }

  // Clamp so the whole window stays inside the work area.
  x = Math.min(x, baseX + availW - width);
  y = Math.min(y, baseY + availH - height);
  x = Math.max(x, baseX);
  y = Math.max(y, baseY);
  return { x: Math.round(x), y: Math.round(y) };
}
