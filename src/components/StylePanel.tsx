import { useToolStyleStore } from "../store/toolStyleStore";
import { TOOL_STYLE_LIMITS } from "../types/toolStyle";
import type { ToolType } from "../types/annotation";

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
        top: placement === "below" ? 54 : undefined,
        bottom: placement === "above" ? 54 : undefined,
        left: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 8px",
        background: "#2d2d44",
        borderRadius: 8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        color: "#eef1ff",
        fontSize: 12,
        zIndex: 51,
        whiteSpace: "nowrap",
      }}
    >
      {tool === "smart" && (
        <>
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
        </>
      )}
      {tool === "rect" && (
        <>
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
        </>
      )}
      {tool === "arrow" && (
        <>
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
        </>
      )}
      {tool === "text" && (
        <>
          <ColorPicker value={settings.text.color} onChange={(color) => updateTool("text", { color })} />
          <NumberSlider
            label="字号"
            value={settings.text.fontSize}
            min={TOOL_STYLE_LIMITS.fontSize.min}
            max={TOOL_STYLE_LIMITS.fontSize.max}
            onChange={(fontSize) => updateTool("text", { fontSize })}
          />
          <FontSelect value={settings.text.fontFamily} onChange={(fontFamily) => updateTool("text", { fontFamily })} />
        </>
      )}
    </div>
  );
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
            border: value === color ? "2px solid #7ea2ff" : "1px solid rgba(255,255,255,0.45)",
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
        style={{ width: 22, height: 22, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
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
        style={{ width: 70 }}
      />
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setClamped(Number(e.target.value))}
        style={{ width: 42, background: "#1f2033", color: "#fff", border: "1px solid #555a78", borderRadius: 4 }}
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
    <div style={{ display: "flex", border: "1px solid #555a78", borderRadius: 5, overflow: "hidden" }}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          style={{
            border: "none",
            padding: "4px 8px",
            background: value === option.value ? "#5b6cff" : "transparent",
            color: "#fff",
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
      style={{ background: "#1f2033", color: "#fff", border: "1px solid #555a78", borderRadius: 4, height: 24 }}
    >
      {FONT_OPTIONS.map((font) => (
        <option key={font.value} value={font.value}>
          {font.label}
        </option>
      ))}
    </select>
  );
}
