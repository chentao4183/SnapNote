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
 * multiple pins can coexist on screen. The window starts near `pointer` (the
 * editor cursor position at click time), falling back to the center of the
 * primary monitor if no pointer is supplied.
 */
export async function createPinWindow(
  dataUrl: string,
  width: number,
  height: number,
  pointer?: { x: number; y: number },
): Promise<WebviewWindow> {
  const label = `pin-${pinCounter++}`;

  // Compute an initial position that keeps the window fully on-screen.
  const { x, y } = await resolveInitialPosition(pointer, width, height);

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

  // The constructor returns immediately; wait until the webview is ready
  // before emitting the payload so the listener is guaranteed to be attached.
  await new Promise<void>((resolve) => {
    win.once("tauri://created", () => resolve());
  });

  await emitTo(label, "pin-load", { dataUrl, width, height } satisfies PinLoadPayload);
  await win.show();
  await win.setFocus();
  return win;
}

/**
 * Pick an initial top-left for a new pin window: prefer near the cursor
 * (offset down-right by 16px so the pin isn't under the pointer), but clamp
 * so the whole window stays within the primary monitor's work area.
 */
async function resolveInitialPosition(
  pointer: { x: number; y: number } | undefined,
  width: number,
  height: number,
): Promise<{ x: number; y: number }> {
  type Monitor = { size: { width: number; height: number }; position: { x: number; y: number } };
  let monitor: Monitor | null = null;
  try {
    // Module-level helper (operates on the current window). Returns the
    // monitor the window is on, or null if it can't be determined.
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
  if (pointer) {
    x = pointer.x + 16;
    y = pointer.y + 16;
  } else {
    x = baseX + Math.max(0, (availW - width) / 2);
    y = baseY + Math.max(0, (availH - height) / 2);
  }

  // Clamp to keep the whole window inside the work area.
  x = Math.min(x, baseX + availW - width);
  y = Math.min(y, baseY + availH - height);
  x = Math.max(x, baseX);
  y = Math.max(y, baseY);
  return { x: Math.round(x), y: Math.round(y) };
}
