import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
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
    await editor.emit("editor-load", selectionData);
    await editor.show();
    await editor.setFocus();
  }
}
