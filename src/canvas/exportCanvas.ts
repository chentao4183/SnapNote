import type Konva from "konva";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
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
 * Load an HTMLImageElement from a data URL, resolving once decoded.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to decode source image"));
    img.src = src;
  });
}

/**
 * Produce a data URL for just the selected region (background + annotations),
 * not the whole window-sized stage.
 *
 * DPI-correct composition: the screenshot is captured at PHYSICAL pixels
 * (xcap native resolution), but cropRegion is in LOGICAL (client) px. The old
 * implementation called stageRef.toDataURL on the Konva backing store, which
 * had already been resampled under non-integer DPR (125%/150%) and produced
 * blurry text in the export.
 *
 * Instead we crop the ORIGINAL screenshot at its physical pixels (zero
 * resampling, pixel-perfect background) and overlay the annotation layer
 * rasterized at the matching physical resolution.
 *
 * Exported so the pin-to-screen flow can reuse the same composed image that
 * save/copy produce.
 */
export async function composeDataUrl(): Promise<string> {
  if (!stageRef) {
    throw new Error("editor stage not ready");
  }
  const { sourceImage, cropRegion } = useEditorStore.getState();
  const { x, y, width, height } = cropRegion;
  if (width < 1 || height < 1) {
    throw new Error("裁剪区域为空");
  }

  // Temporarily deselect so selection handles don't appear in the rasterized
  // annotation layer. Restored in finally.
  const selectedId = useEditorStore.getState().selectedId;
  useEditorStore.getState().selectAnnotation(null);
  await nextFrame();
  try {
    // Scale from logical crop coords to the source image's physical pixels.
    // Derive from the image's natural size vs the logical window width rather
    // than window.devicePixelRatio, so mixed-DPI multi-monitor captures
    // (where the source physical width != innerWidth * DPR) still align.
    const orig = await loadImage(sourceImage);
    const scale = orig.naturalWidth / window.innerWidth;
    const sx = Math.round(x * scale);
    const sy = Math.round(y * scale);
    const sw = Math.round(width * scale);
    const sh = Math.round(height * scale);

    // 1. Background: blit the original physical pixels 1:1, no resampling.
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(orig, sx, sy, sw, sh, 0, 0, sw, sh);

    // 2. Annotation layer: rasterize at the same physical resolution so vector
    //    shapes stay crisp and align with the background. stageRef.toDataURL
    //    multiplies the logical crop rect by pixelRatio = scale.
    const annoDataUrl = stageRef.toDataURL({
      x,
      y,
      width,
      height,
      pixelRatio: scale,
      mimeType: "image/png",
    });
    const annoImg = await loadImage(annoDataUrl);
    // Annotations are vector and may contain transparency; draw on top.
    ctx.drawImage(annoImg, 0, 0, sw, sh);

    return canvas.toDataURL("image/png");
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
 * each becomes its own window.
 *
 * The pin appears at the screenshot's original screen location, so it
 * visually "lands back where the selection was" — the same UX as Snipaste.
 *
 * Position math: cropRegion is in the editor window's client-area logical
 * coordinates. To land on the right screen pixel we add the editor window's
 * own screen position (innerPosition, in physical px) converted to logical,
 * so the pin aligns even if the selector window isn't at screen (0,0) —
 * which can happen under DPI scaling or with multi-monitor setups.
 */
export async function pinToScreen(): Promise<void> {
  const dataUrl = await composeDataUrl();
  const { x, y, width, height } = useEditorStore.getState().cropRegion;
  if (width < 1 || height < 1) {
    throw new Error("裁剪区域为空");
  }

  // The editor currently always runs inside the selector window, so the
  // current webview is the selector. Read its client-area origin in logical
  // screen px and offset the crop region by it.
  let originX = 0;
  let originY = 0;
  try {
    const win = getCurrentWebviewWindow();
    const [innerPos, factor] = await Promise.all([
      win.innerPosition(),
      win.scaleFactor().catch(() => 1),
    ]);
    // innerPosition is physical px; convert to logical to match cropRegion.
    originX = innerPos.x / factor;
    originY = innerPos.y / factor;
  } catch {
    // Fallback: assume the editor window is at screen (0,0).
  }

  await createPinWindow(dataUrl, Math.round(width), Math.round(height), {
    x: Math.round(originX + x),
    y: Math.round(originY + y),
  });
}
