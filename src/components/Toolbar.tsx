import { useState } from "react";
import { exportToClipboard, exportToFile } from "../canvas/exportCanvas";
import { hideCurrentWindow } from "../ipc/bridge";
import { useEditorStore } from "../store/editorStore";
import type { ToolType } from "../types/annotation";
import StylePanel from "./StylePanel";

interface ToolDef {
  id: ToolType;
  label: string;
  hint: string;
}

const TOOLS: ToolDef[] = [
  { id: "smart", label: "★", hint: "智能备注 (S)" },
  { id: "rect", label: "□", hint: "矩形 / 椭圆 (R)" },
  { id: "arrow", label: "↗", hint: "箭头 (A)" },
  { id: "text", label: "T", hint: "文字 (T)" },
  { id: "mosaic", label: "▦", hint: "马赛克 (M)" },
];

interface Props {
  onClose?: () => void;
}

export default function Toolbar({ onClose }: Props) {
  const currentTool = useEditorStore((s) => s.currentTool);
  const setTool = useEditorStore((s) => s.setTool);
  const cropRegion = useEditorStore((s) => s.cropRegion);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const [busy, setBusy] = useState(false);
  const [openPanel, setOpenPanel] = useState<StyleTool | null>(null);

  const toolbarWidth = 430;
  const toolbarHeight = 50;
  const gap = 8;
  const topBelow = cropRegion.y + cropRegion.height + gap;
  const placeBelow = topBelow + toolbarHeight <= window.innerHeight - gap;
  const top = placeBelow ? topBelow : Math.max(gap, cropRegion.y - toolbarHeight - gap);
  const left = clamp(cropRegion.x + cropRegion.width - toolbarWidth, gap, window.innerWidth - toolbarWidth - gap);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      alert(`操作失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  function closeEditor() {
    if (onClose) onClose();
    else void hideCurrentWindow();
  }

  function selectTool(tool: ToolType) {
    setTool(tool);
    if (isStyleTool(tool)) {
      setOpenPanel(openPanel === tool ? null : tool);
    } else {
      setOpenPanel(null);
    }
  }

  return (
    <div style={{ position: "absolute", top, left, zIndex: 50 }}>
      <div
        style={{
          display: "flex",
          gap: 4,
          background: "#2d2d44",
          padding: 6,
          borderRadius: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          userSelect: "none",
        }}
      >
        {TOOLS.map((t) => (
          <button
            key={t.id}
            title={t.hint}
            onClick={() => selectTool(t.id)}
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
        <button title="重做 (Ctrl+Y)" style={btn(false)} onClick={redo} disabled={busy}>
          ↷
        </button>

        <div style={divider} />

        <button
          title="复制到剪贴板 (Ctrl+C)"
          style={btn(false)}
          onClick={() =>
            run(async () => {
              await exportToClipboard();
              closeEditor();
            })
          }
          disabled={busy}
        >
          ⧉
        </button>
        <button
          title="保存为 PNG"
          style={btn(false)}
          onClick={() =>
            run(async () => {
              const saved = await exportToFile("png");
              if (saved) closeEditor();
            })
          }
          disabled={busy}
        >
          ▣
        </button>
        <button title="退出 (Esc)" style={{ ...btn(false), color: "#ff6b81" }} onClick={closeEditor} disabled={busy}>
          ×
        </button>
      </div>
      {openPanel && <StylePanel tool={openPanel} placement={placeBelow ? "below" : "above"} />}
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

type StyleTool = Extract<ToolType, "smart" | "rect" | "arrow" | "text">;

function isStyleTool(tool: ToolType): tool is StyleTool {
  return tool === "smart" || tool === "rect" || tool === "arrow" || tool === "text";
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}
