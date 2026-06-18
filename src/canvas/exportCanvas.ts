import type Konva from "konva";
import { copyImageToClipboard, saveImage } from "../ipc/bridge";
import { useEditorStore } from "../store/editorStore";

/**
 * The reference to the editor's Konva Stage is registered here (set from
 * EditorStage via a ref) so the toolbar can rasterize the composed scene.
 */
let stageRef: Konva.Stage | null = null;

export function setEditorStage(stage: Konva.Stage | null) {
  stageRef = stage;
}

/**
 * Produce a data URL for just the selected region (background + annotations),
 * not the whole window-sized stage. Without this crop, toDataURL captures the
 * fullscreen stage and the exported image is mostly empty/transparent.
 */
async function composeDataUrl(): Promise<string> {
  if (!stageRef) {
    throw new Error("editor stage not ready");
  }
  const selectedId = useEditorStore.getState().selectedId;
  useEditorStore.getState().selectAnnotation(null);
  await nextFrame();
  try {
    const { x, y, width, height } = useEditorStore.getState().cropRegion;
    return stageRef.toDataURL({
      x,
      y,
      width,
      height,
      pixelRatio: window.devicePixelRatio || 1,
      mimeType: "image/png",
    });
  } finally {
    useEditorStore.getState().selectAnnotation(selectedId);
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function exportToClipboard(): Promise<void> {
  const dataUrl = await composeDataUrl();
  await copyImageToClipboard(dataUrl);
}

export async function exportToFile(format: "png" | "jpg"): Promise<boolean> {
  const dataUrl = await composeDataUrl();
  const { save } = await import("@tauri-apps/plugin-dialog");
  const path = await save({
    defaultPath: `snapnote-${Date.now()}.${format}`,
    filters: [{ name: format.toUpperCase(), extensions: [format] }],
  });
  if (!path) {
    return false;
  }
  await saveImage(dataUrl, path, format);
  return true;
}
