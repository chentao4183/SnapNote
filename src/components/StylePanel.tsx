import type { CSSProperties, ReactNode } from "react";
import { useToolStyleStore } from "../store/toolStyleStore";
import type { ToolType } from "../types/annotation";
import { TOOL_STYLE_LIMITS } from "../types/toolStyle";
import NumberingControls from "./NumberingControls";

const PRESET_COLORS = ["#ff4757", "#1890ff", "#52c41a", "#faad14", "#722ed1", "#000000", "#ffffff", "#fa8c16"];
const FONT_OPTIONS = [
  { label: "跟随系统", value: "" },
  { label: "微软雅黑", value: "Microsoft YaHei" },
  { label: "宋体", value: "SimSun" },
  { label: "黑体", value: "SimHei" },
  { label: "Arial", value: "Arial" },
  { label: "Consolas", value: "Consolas" },
];

interface Props {
  tool: Extract<ToolType, "smart" | "rect" | "arrow" | "text">;
  placement: "above" | "below";
}

export default function StylePanel({ tool, placement }: Props) {
  const settings = useToolStyleStore((s) => s.settings);
  const updateTool = useToolStyleStore((s) => s.updateTool);

  return (
    <div
      style={{
        position: "absolute",
        top: placement === "below" ? 44 : undefined,
        bottom: placement === "above" ? 44 : undefined,
        left: 0,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 4,
        padding: "4px 6px",
        background: "#f7f7f7",
        border: "1px solid #1783ff",
        borderRadius: 2,
        boxShadow: "0 1px 3px rgba(0,0,0,0.16)",
        color: "#263238",
        fontSize: 12,
        zIndex: 51,
        whiteSpace: "nowrap",
        maxWidth: "calc(100vw - 8px)",
        overflowX: "auto",
      }}
    >
      {tool === "smart" && (
        <>
          <PanelRow>
            <ColorPicker value={settings.smart.color} onChange={(color) => updateTool("smart", { color })} />
            <NumberSlider
              label="线宽"
              value={settings.smart.strokeWidth}
              min={TOOL_STYLE_LIMITS.strokeWidth.min}
              max={TOOL_STYLE_LIMITS.strokeWidth.max}
              onChange={(strokeWidth) => updateTool("smart", { strokeWidth })}
            />
            <Segmented
              value={settings.smart.shape}
              options={[
                { label: "矩形", value: "rect" },
                { label: "椭圆", value: "ellipse" },
              ]}
              onChange={(shape) => updateTool("smart", { shape })}
            />
            <NumberSlider
              label="字号"
              value={settings.smart.fontSize}
              min={TOOL_STYLE_LIMITS.fontSize.min}
              max={TOOL_STYLE_LIMITS.fontSize.max}
              onChange={(fontSize) => updateTool("smart", { fontSize })}
            />
            <FontSelect value={settings.smart.fontFamily} onChange={(fontFamily) => updateTool("smart", { fontFamily })} />
            <NumberingControls tool="smart" mode="toggle" />
          </PanelRow>
          <NumberingControls tool="smart" mode="details" />
        </>
      )}
      {tool === "rect" && (
        <>
          <PanelRow>
            <ColorPicker value={settings.rect.color} onChange={(color) => updateTool("rect", { color })} />
            <NumberSlider
              label="线宽"
              value={settings.rect.strokeWidth}
              min={TOOL_STYLE_LIMITS.strokeWidth.min}
              max={TOOL_STYLE_LIMITS.strokeWidth.max}
              onChange={(strokeWidth) => updateTool("rect", { strokeWidth })}
            />
            <Segmented
              value={settings.rect.shape}
              options={[
                { label: "矩形", value: "rect" },
                { label: "椭圆", value: "ellipse" },
              ]}
              onChange={(shape) => updateTool("rect", { shape })}
            />
            <NumberingControls tool="rect" mode="toggle" />
          </PanelRow>
          <NumberingControls tool="rect" mode="details" />
        </>
      )}
      {tool === "arrow" && (
        <>
          <PanelRow>
            <ColorPicker value={settings.arrow.color} onChange={(color) => updateTool("arrow", { color })} />
            <NumberSlider
              label="线宽"
              value={settings.arrow.strokeWidth}
              min={TOOL_STYLE_LIMITS.strokeWidth.min}
              max={TOOL_STYLE_LIMITS.strokeWidth.max}
              onChange={(strokeWidth) => updateTool("arrow", { strokeWidth })}
            />
            <Segmented
              value={settings.arrow.lineStyle}
              options={[
                { label: "实线", value: "solid" },
                { label: "虚线", value: "dashed" },
              ]}
              onChange={(lineStyle) => updateTool("arrow", { lineStyle })}
            />
            <NumberSlider
              label="箭头"
              value={settings.arrow.arrowHeadSize}
              min={TOOL_STYLE_LIMITS.arrowHeadSize.min}
              max={TOOL_STYLE_LIMITS.arrowHeadSize.max}
              onChange={(arrowHeadSize) => updateTool("arrow", { arrowHeadSize })}
            />
            <NumberingControls tool="arrow" mode="toggle" />
          </PanelRow>
          <NumberingControls tool="arrow" mode="details" />
        </>
      )}
      {tool === "text" && (
        <>
          <PanelRow>
            <ColorPicker value={settings.text.color} onChange={(color) => updateTool("text", { color })} />
            <NumberSlider
              label="字号"
              value={settings.text.fontSize}
              min={TOOL_STYLE_LIMITS.fontSize.min}
              max={TOOL_STYLE_LIMITS.fontSize.max}
              onChange={(fontSize) => updateTool("text", { fontSize })}
            />
            <FontSelect value={settings.text.fontFamily} onChange={(fontFamily) => updateTool("text", { fontFamily })} />
            <NumberingControls tool="text" mode="toggle" />
          </PanelRow>
          <NumberingControls tool="text" mode="details" />
        </>
      )}
    </div>
  );
}

function PanelRow({ children }: { children: ReactNode }) {
  return <div style={panelRowStyle}>{children}</div>;
}

function ColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          title={color}
          onClick={() => onChange(color)}
          style={{
            width: 18,
            height: 18,
            borderRadius: 2,
            border: value === color ? "2px solid #1783ff" : "1px solid #455a64",
            background: color,
            cursor: "pointer",
          }}
        />
      ))}
      <input
        title="自定义颜色"
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 22, height: 22, padding: 0, border: "1px solid #1783ff", background: "#fff", cursor: "pointer" }}
      />
    </div>
  );
}

function NumberSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  function setClamped(next: number) {
    onChange(Math.min(max, Math.max(min, next)));
  }

  return (
    <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => setClamped(Number(e.target.value))}
        onWheel={(e) => {
          e.preventDefault();
          setClamped(value + (e.deltaY < 0 ? 1 : -1));
        }}
        style={{ width: 70, accentColor: "#1783ff" }}
      />
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setClamped(Number(e.target.value))}
        style={{ width: 42, background: "#fff", color: "#263238", border: "1px solid #1783ff", borderRadius: 0 }}
      />
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <div style={{ display: "flex", border: "1px solid #1783ff", borderRadius: 0, overflow: "hidden" }}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          style={{
            border: "none",
            padding: "4px 8px",
            background: value === option.value ? "#1783ff" : "#fff",
            color: value === option.value ? "#fff" : "#263238",
            cursor: "pointer",
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FontSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ background: "#fff", color: "#263238", border: "1px solid #1783ff", borderRadius: 0, height: 24 }}
    >
      {FONT_OPTIONS.map((font) => (
        <option key={font.value} value={font.value}>
          {font.label}
        </option>
      ))}
    </select>
  );
}

const panelRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  whiteSpace: "nowrap",
  flexWrap: "nowrap",
};
