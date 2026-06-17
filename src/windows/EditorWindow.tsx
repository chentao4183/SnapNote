import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useEditorStore } from "../store/editorStore";
import EditorStage from "../canvas/EditorStage";
import Toolbar from "../components/Toolbar";

interface LoadPayload {
  x: number;
  y: number;
  width: number;
  height: number;
  fullBase64: string;
}

export default function EditorWindow() {
  const init = useEditorStore((s) => s.init);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unlisten = listen<LoadPayload>("editor-load", (event) => {
      const p = event.payload;
      // Crop the screenshot to the selection rect on a canvas, then store base64.
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = p.width;
        canvas.height = p.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, p.x, p.y, p.width, p.height, 0, 0, p.width, p.height);
        const cropped = canvas.toDataURL("image/png");
        init(cropped, { x: 0, y: 0, width: p.width, height: p.height });
        setLoaded(true);
      };
      img.src = p.fullBase64;
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [init]);

  if (!loaded) return <div style={{ background: "#1a1a2e", width: "100vw", height: "100vh" }} />;

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#1a1a2e" }}>
      <EditorStage />
      <Toolbar />
    </div>
  );
}
