import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useEditorStore } from "../store/editorStore";
import EditorStage from "../canvas/EditorStage";
import Toolbar from "../components/Toolbar";
import TextInputOverlay from "../components/TextInputOverlay";
import { useActiveTool } from "../tools";
import { useSelectionTool } from "../tools/useSelectionTool";
import { useEditorShortcuts } from "../tools/useEditorShortcuts";
import { hideCurrentWindow } from "../ipc/bridge";

interface LoadPayload {
  x: number;
  y: number;
  width: number;
  height: number;
  fullBase64: string;
}

export default function EditorWindow() {
  const init = useEditorStore((s) => s.init);
  const active = useActiveTool();
  const selection = useSelectionTool();
  useEditorShortcuts({ onExit: () => hideCurrentWindow() });

  useEffect(() => {
    const unlisten = listen<LoadPayload>("editor-load", (event) => {
      const p = event.payload;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = p.width;
        canvas.height = p.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, p.x, p.y, p.width, p.height, 0, 0, p.width, p.height);
        const cropped = canvas.toDataURL("image/png");
        init(cropped, { x: 0, y: 0, width: p.width, height: p.height });
      };
      img.src = p.fullBase64;
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [init]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#1a1a2e" }}>
      <EditorStage onEditText={selection.beginEditText} />
      <Toolbar />
      {active.kind === "smart" && active.smart.isEnteringText && active.smart.textPos && (
        <TextInputOverlay
          x={active.smart.textPos.x}
          y={active.smart.textPos.y - 28}
          initial=""
          onSubmit={active.smart.submitText}
          onCancel={active.smart.cancelText}
        />
      )}
      {active.kind === "text" && active.text.textPos && (
        <TextInputOverlay
          x={active.text.textPos.x}
          y={active.text.textPos.y - 28}
          initial=""
          onSubmit={active.text.submit}
          onCancel={active.text.cancel}
        />
      )}
      {selection.editing && (
        <TextInputOverlay
          x={selection.editing.x}
          y={selection.editing.y - 28}
          initial={selection.editing.initial}
          onSubmit={selection.commitEditText}
          onCancel={selection.cancelEdit}
        />
      )}
    </div>
  );
}
