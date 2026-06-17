import type Konva from "konva";
import { copyImageToClipboard, saveImage } from "../ipc/bridge";

/**
 * The reference to the editor's Konva Stage is registered here (set from
 * EditorStage via a ref) so the toolbar can rasterize the whole composed scene
 * — background + annotations — with one `stage.toDataURL()` call.
 */
let stageRef: Konva.Stage | null = null;

export function setEditorStage(stage: Konva.Stage | null) {
  stageRef = stage;
}

async function composeDataUrl(): Promise<string> {
  if (!stageRef) {
    throw new Error("editor stage not ready");
  }
  return stageRef.toDataURL({ pixelRatio: window.devicePixelRatio || 1, mimeType: "image/png" });
}

export async function exportToClipboard(): Promise<void> {
  const dataUrl = await composeDataUrl();
  await copyImageToClipboard(dataUrl);
}

export async function exportToFile(format: "png" | "jpg"): Promise<void> {
  const dataUrl = await composeDataUrl();
  const { save } = await import("@tauri-apps/plugin-dialog");
  const path = await save({
    defaultPath: `snapnote-${Date.now()}.${format}`,
    filters: [{ name: format.toUpperCase(), extensions: [format] }],
  });
  if (path) {
    await saveImage(dataUrl, path, format);
  }
}
