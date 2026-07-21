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
 * Two-step handshake to avoid both "no image" and "blank flash" bugs:
 *   1. Wait for `pin-ready-{label}` (PinWindow has registered its pin-load
 *      listener) before emitting pin-load. Tauri drops events with no
 *      subscribers, and the webview's JS isn't ready at tauri://created.
 *   2. Wait for `pin-rendered-{label}` (<img> finished decoding) before
 *      calling win.show(), so the window appears with pixels already drawn
 *      instead of flashing a blank rectangle while the PNG decodes.
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

  // Two-step handshake to avoid a blank-frame flash:
  //   1. pin-ready: the PinWindow has registered its pin-load listener.
  //      Only then is it safe to emit pin-load (Tauri drops events with no
  //      subscribers).
  //   2. pin-rendered: the <img> has finished decoding. Only then do we
  //      win.show(), so the window appears with pixels already on screen
  //      instead of briefly showing a blank transparent rectangle.
  await waitForEvent(`pin-ready-${label}`, 5000, "pin window did not become ready in time");

  await emitTo(label, "pin-load", { dataUrl, width, height } satisfies PinLoadPayload);

  // Don't let a decode hang block the pin forever — fall back to showing the
  // window after 3s even if pin-rendered never arrives.
  await waitForEvent(`pin-rendered-${label}`, 3000, "", { suppressTimeoutError: true });

  await win.show();
  await win.setFocus();
  return win;
}

/**
 * Resolve when an event with the given name fires. Rejects after `timeoutMs`
 * unless `suppressTimeoutError` is set, in which case it resolves silently —
 * useful when the event is best-effort (e.g. a render signal we don't want
 * to hard-fail on).
 */
function waitForEvent(
  eventName: string,
  timeoutMs: number,
  timeoutMessage: string,
  options?: { suppressTimeoutError?: boolean },
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      void unlistenPromise.then((fn) => fn());
      if (options?.suppressTimeoutError) resolve();
      else reject(new Error(timeoutMessage));
    }, timeoutMs);

    const unlistenPromise = listen(eventName, () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void unlistenPromise.then((fn) => fn());
      resolve();
    });
  });
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
