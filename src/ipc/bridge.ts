import { invoke } from "@tauri-apps/api/core";
import { listen, emitTo, type UnlistenFn } from "@tauri-apps/api/event";
import { currentMonitor, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
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

// ---- Screenshot shortcut ----

/** Returns the screenshot shortcut currently registered in Rust (defaults to "F1"). */
export async function getScreenshotShortcut(): Promise<string> {
  return invoke<string>("get_screenshot_shortcut");
}

/**
 * Validate + swap + persist a new screenshot shortcut. Throws with a Chinese
 * error message if the key string is invalid or registration fails.
 */
export async function setScreenshotShortcut(key: string): Promise<void> {
  await invoke("set_screenshot_shortcut", { key });
}

// ---- Events ----

export function onScreenshotTriggered(cb: () => void): Promise<UnlistenFn> {
  return listen("screenshot-triggered", () => cb());
}

/**
 * Fired from Rust when the tray "开机自启" checkbox is toggled, so the main
 * window's UI stays in sync with the registry truth if it's open.
 */
export function onAutostartChanged(cb: (enabled: boolean) => void): Promise<UnlistenFn> {
  return listen<boolean>("autostart-changed", (event) => cb(event.payload));
}

/**
 * Fired from Rust when the screenshot shortcut is remapped in the
 * shortcut-settings window, so the main window can refresh its mirror of the
 * active key (persistence lives on the Rust side; this keeps the about-page
 * copy in sync without it having to re-query).
 */
export function onShortcutChanged(cb: (key: string) => void): Promise<UnlistenFn> {
  return listen<string>("shortcut-changed", (event) => cb(event.payload));
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
  pixelWidth: number;
  pixelHeight: number;
}

/**
 * Create a new borderless, always-on-top, always-floating pin window showing
 * the given image data URL at 1:1 scale. Each call opens a fresh window, so
 * multiple pins can coexist on screen.
 *
 * `pixelWidth`, `pixelHeight`, and `position` are PHYSICAL screen pixels.
 * Using the PNG's physical dimensions as the window's inner size guarantees
 * a 1:1 raster mapping regardless of the destination monitor's DPI factor.
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
  pixelWidth: number,
  pixelHeight: number,
  position?: { x: number; y: number },
): Promise<WebviewWindow> {
  const label = `pin-${pinCounter++}`;

  // Monitor geometry is physical. Keep all clamping in that unit.
  const monitor = await currentMonitor().catch(() => null);
  const { x, y } = clampPhysicalPositionToScreen(position, pixelWidth, pixelHeight, monitor);
  const initialFactor = monitor?.scaleFactor || window.devicePixelRatio || 1;

  // WindowOptions accept logical units only. These are merely hidden-window
  // bootstrap values; after the webview is ready we set exact physical bounds.
  const win = new WebviewWindow(label, {
    url: "pin.html",
    title: "StepMark Pin",
    width: pixelWidth / initialFactor,
    height: pixelHeight / initialFactor,
    x: x / initialFactor,
    y: y / initialFactor,
    decorations: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    shadow: false,
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

  // Correct the hidden window using unambiguous physical units before its
  // image is decoded or shown.
  await win.setSize(new PhysicalSize(pixelWidth, pixelHeight));
  await win.setPosition(new PhysicalPosition(x, y));

  await emitTo(label, "pin-load", {
    dataUrl,
    pixelWidth,
    pixelHeight,
  } satisfies PinLoadPayload);

  // Don't let a decode hang block the pin forever — fall back to showing the
  // window after 3s even if pin-rendered never arrives.
  await waitForEvent(`pin-rendered-${label}`, 3000, "", { suppressTimeoutError: true });

  // On Windows, decorations:false transparent windows can have an invisible
  // DWM border that shifts the visible content relative to the requested
  // x/y. Measure outer vs inner position and re-position so the inner
  // (visible) top-left lands exactly at (x, y). Done before show() so the
  // user never sees the offset version.
  try {
    const outer = await win.outerPosition();
    const inner = await win.innerPosition();
    const dx = inner.x - outer.x;
    const dy = inner.y - outer.y;
    if (dx !== 0 || dy !== 0) {
      await win.setPosition(new PhysicalPosition(x - dx, y - dy));
    }
  } catch {
    /* keep default position */
  }

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
function clampPhysicalPositionToScreen(
  position: { x: number; y: number } | undefined,
  width: number,
  height: number,
  monitor: Awaited<ReturnType<typeof currentMonitor>>,
): { x: number; y: number } {
  const fallbackFactor = window.devicePixelRatio || 1;
  const workArea = monitor?.workArea;
  const availW = workArea?.size.width ?? window.screen.availWidth * fallbackFactor;
  const availH = workArea?.size.height ?? window.screen.availHeight * fallbackFactor;
  const baseX = workArea?.position.x ?? 0;
  const baseY = workArea?.position.y ?? 0;

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
