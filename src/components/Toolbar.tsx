import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { exportToClipboard, exportToFile } from "../canvas/exportCanvas";
import { hideCurrentWindow } from "../ipc/bridge";
import { useEditorStore } from "../store/editorStore";
import type { ToolType } from "../types/annotation";
import StylePanel from "./StylePanel";

type IconName = "smart" | "rect" | "arrow" | "text" | "mosaic" | "undo" | "redo" | "close" | "save" | "copy";

interface ToolDef {
  id: ToolType;
  icon: IconName;
  hint: string;
}

const TOOLS: ToolDef[] = [
  { id: "smart", icon: "smart", hint: "智能备注 (S)" },
  { id: "rect", icon: "rect", hint: "矩形 / 椭圆 (R)" },
  { id: "arrow", icon: "arrow", hint: "箭头 (A)" },
  { id: "text", icon: "text", hint: "文本 (T)" },
  { id: "mosaic", icon: "mosaic", hint: "马赛克 (M)" },
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

  const toolbarWidth = 318;
  const toolbarHeight = 36;
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
          gap: 2,
          background: "#f7f7f7",
          padding: 4,
          border: "1px solid #1783ff",
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
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
            <ToolbarIcon name={t.icon} />
          </button>
        ))}

        <div style={divider} />

        <button title="撤销 (Ctrl+Z)" style={btn(false)} onClick={undo} disabled={busy}>
          <ToolbarIcon name="undo" />
        </button>
        <button title="重做 (Ctrl+Y)" style={btn(false)} onClick={redo} disabled={busy}>
          <ToolbarIcon name="redo" />
        </button>

        <div style={divider} />

        <button title="退出 (Esc)" style={{ ...btn(false), color: "#d32f2f" }} onClick={closeEditor} disabled={busy}>
          <ToolbarIcon name="close" />
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
          <ToolbarIcon name="save" />
        </button>
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
          <ToolbarIcon name="copy" />
        </button>
      </div>
      {openPanel && <StylePanel tool={openPanel} placement={placeBelow ? "below" : "above"} />}
    </div>
  );
}

function ToolbarIcon({ name }: { name: IconName }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: icon,
    "aria-hidden": true,
  } as const;

  const content: Record<IconName, ReactNode> = {
    smart: (
      <path
        d="m12 2.6 2.9 5.85 6.45.95-4.68 4.55 1.1 6.42L12 17.33l-5.77 3.04 1.1-6.42L2.65 9.4l6.45-.95L12 2.6Z"
        fill="currentColor"
        stroke="none"
      />
    ),
    rect: <rect x="3" y="6" width="18" height="12" rx="0.8" />,
    arrow: (
      <>
        <path d="M4 20 20 4" />
        <path d="M10 4h10v10" />
      </>
    ),
    text: (
      <>
        <path d="M5 5h14" />
        <path d="M12 5v14" />
      </>
    ),
    mosaic: (
      <>
        <rect x="3" y="3" width="5" height="5" />
        <rect x="9.5" y="3" width="5" height="5" />
        <rect x="16" y="3" width="5" height="5" />
        <rect x="3" y="9.5" width="5" height="5" />
        <rect x="9.5" y="9.5" width="5" height="5" />
        <rect x="16" y="9.5" width="5" height="5" />
        <rect x="3" y="16" width="5" height="5" />
        <rect x="9.5" y="16" width="5" height="5" />
        <rect x="16" y="16" width="5" height="5" />
      </>
    ),
    undo: (
      <>
        <path d="M8.5 5.5 3 11l5.5 5.5" />
        <path d="M4 11h9.25a6.25 6.25 0 1 1-4.43 10.66" />
      </>
    ),
    redo: (
      <>
        <path d="m15.5 5.5 5.5 5.5-5.5 5.5" />
        <path d="M20 11h-9.25a6.25 6.25 0 1 0 4.43 10.66" />
      </>
    ),
    close: (
      <>
        <path d="M5 5 19 19" />
        <path d="M19 5 5 19" />
      </>
    ),
    save: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="1" />
        <rect x="8" y="8" width="8" height="8" fill="currentColor" stroke="none" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="1" />
        <path d="M4 16V4h12" />
      </>
    ),
  };

  return <svg {...common}>{content[name]}</svg>;
}

function btn(active: boolean): CSSProperties {
  return {
    width: 26,
    height: 26,
    border: "none",
    borderRadius: 0,
    background: active ? "#1783ff" : "transparent",
    color: active ? "#fff" : "#263238",
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s",
  };
}

const icon: CSSProperties = {
  display: "block",
  flex: "0 0 auto",
};

const divider: CSSProperties = {
  width: 1,
  alignSelf: "stretch",
  background: "#1783ff",
  margin: "3px 4px",
};

type StyleTool = Extract<ToolType, "smart" | "rect" | "arrow" | "text">;

function isStyleTool(tool: ToolType): tool is StyleTool {
  return tool === "smart" || tool === "rect" || tool === "arrow" || tool === "text";
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}
