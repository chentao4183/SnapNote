import { useState } from "react";
import { useEditorStore } from "../store/editorStore";
import type { ToolType } from "../types/annotation";
import { exportToClipboard, exportToFile } from "../canvas/exportCanvas";
import { hideCurrentWindow } from "../ipc/bridge";

interface ToolDef {
  id: ToolType;
  label: string;
  hint: string;
}

const TOOLS: ToolDef[] = [
  { id: "select", label: "⬚", hint: "选择 (V)" },
  { id: "smart", label: "✦", hint: "智能标注 (S)" },
  { id: "rect", label: "▭", hint: "矩形 (R)" },
  { id: "arrow", label: "➤", hint: "箭头 (A)" },
  { id: "text", label: "T", hint: "文字 (T)" },
  { id: "mosaic", label: "▦", hint: "马赛克 (M)" },
];

export default function Toolbar() {
  const currentTool = useEditorStore((s) => s.currentTool);
  const setTool = useEditorStore((s) => s.setTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 4,
        background: "#2d2d44",
        padding: 6,
        borderRadius: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        zIndex: 50,
        userSelect: "none",
      }}
    >
      {TOOLS.map((t) => (
        <button
          key={t.id}
          title={t.hint}
          onClick={() => setTool(t.id)}
          style={btn(currentTool === t.id)}
          disabled={busy}
        >
          {t.label}
        </button>
      ))}

      <div style={divider} />

      <button title="撤销 (Ctrl+Z)" style={btn(false)} onClick={undo} disabled={busy}>
        ↶
      </button>
      <button title="重做 (Ctrl+Shift+Z)" style={btn(false)} onClick={redo} disabled={busy}>
        ↷
      </button>

      <div style={divider} />

      <button title="复制到剪贴板 (Ctrl+C)" style={btn(false)} onClick={() => run(exportToClipboard)} disabled={busy}>
        ⧉
      </button>
      <button title="保存为 PNG" style={btn(false)} onClick={() => run(() => exportToFile("png"))} disabled={busy}>
        💾
      </button>
      <button title="保存为 JPG" style={btn(false)} onClick={() => run(() => exportToFile("jpg"))} disabled={busy}>
        🖼
      </button>

      <div style={divider} />

      <button title="退出 (Esc)" style={{ ...btn(false), color: "#ff6b81" }} onClick={() => hideCurrentWindow()} disabled={busy}>
        ✕
      </button>
    </div>
  );
}

function btn(active: boolean): React.CSSProperties {
  return {
    width: 38,
    height: 38,
    border: "none",
    borderRadius: 7,
    background: active ? "#5b6cff" : "transparent",
    color: active ? "#fff" : "#cfd2e3",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s",
  };
}

const divider: React.CSSProperties = {
  width: 1,
  alignSelf: "stretch",
  background: "rgba(255,255,255,0.12)",
  margin: "2px 4px",
};
