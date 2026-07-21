import type Konva from "konva";
import { copyImageToClipboard, createPinWindow, saveImage } from "../ipc/bridge";
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
 *
 * Exported so the pin-to-screen flow can reuse the same composed image that
 * save/copy produce.
 */
export async function composeDataUrl(): Promise<string> {
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
    defaultPath: `stepmark-${Date.now()}.${format}`,
    filters: [{ name: format.toUpperCase(), extensions: [format] }],
  });
  if (!path) {
    return false;
  }
  await saveImage(dataUrl, path, format);
  return true;
}

/**
 * Pin the composed (cropped + annotated) image to the screen as a new
 * always-on-top, borderless, draggable window. Multiple pins can coexist;
 * each becomes its own window. The pin starts at 1:1 scale, anchored near the
 * cursor so it appears where the user expects.
 */
export async function pinToScreen(pointer?: { x: number; y: number }): Promise<void> {
  const dataUrl = await composeDataUrl();
  const { width, height } = useEditorStore.getState().cropRegion;
  if (width < 1 || height < 1) {
    throw new Error("裁剪区域为空");
  }
  await createPinWindow(dataUrl, Math.round(width), Math.round(height), pointer);
}
