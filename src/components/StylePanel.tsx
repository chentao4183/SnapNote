import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useToolStyleStore } from "../store/toolStyleStore";
import type { ToolType } from "../types/annotation";
import { TOOL_STYLE_LIMITS } from "../types/toolStyle";
import NumberingControls from "./NumberingControls";

const PANEL_CONTROL_HEIGHT = 26;
const PRESET_COLOR_ROWS = [
  ["#000000", "#595959", "#ff4757", "#fa541c", "#fa8c16", "#faad14", "#52c41a", "#13c2c2", "#1890ff", "#722ed1"],
  ["#ffffff", "#d9d9d9", "#ff7875", "#ff7a45", "#ffc069", "#ffd666", "#95de64", "#5cdbd3", "#69c0ff", "#b37feb"],
];
const PRESET_COLORS = PRESET_COLOR_ROWS.flat();
const CUSTOM_COLOR_FALLBACK = "#ff4757";
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
        padding: 4,
        background: "#f7f7f7",
        border: "1px solid #1783ff",
        borderRadius: 2,
        boxShadow: "0 1px 3px rgba(0,0,0,0.16)",
        color: "#263238",
        fontSize: 12,
        lineHeight: "16px",
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
  const normalizedValue = normalizeHex(value);
  const valueIsPreset = isPresetColor(normalizedValue);
  const [customColor, setCustomColor] = useState(valueIsPreset ? CUSTOM_COLOR_FALLBACK : normalizedValue);
  const customPreview = valueIsPreset ? customColor : normalizedValue;

  useEffect(() => {
    if (!valueIsPreset) {
      setCustomColor(normalizedValue);
    }
  }, [normalizedValue, valueIsPreset]);

  function selectCustom(color: string) {
    const next = normalizeHex(color);
    setCustomColor(next);
    onChange(next);
  }

  return (
    <div style={colorPickerStyle}>
      <div style={presetColorGridStyle}>
        {PRESET_COLOR_ROWS.map((row) =>
          row.map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              style={colorSwatchStyle(color, normalizedValue === color)}
            />
          )),
        )}
      </div>
      <label style={customColorStyle(customPreview, !valueIsPreset)}>
        <input type="color" value={customPreview} onChange={(e) => selectCustom(e.target.value)} style={hiddenColorInputStyle} />
      </label>
    </div>
  );
}

function normalizeHex(color: string): string {
  return color.toLowerCase();
}

function isPresetColor(color: string): boolean {
  return PRESET_COLORS.includes(color);
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
    <label style={{ display: "flex", alignItems: "center", gap: 5, height: PANEL_CONTROL_HEIGHT }}>
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
        style={{ width: 70, height: PANEL_CONTROL_HEIGHT, accentColor: "#1783ff" }}
      />
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setClamped(Number(e.target.value))}
        style={numberInputStyle}
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
    <div style={segmentedStyle}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          style={{
            border: "none",
            minWidth: 38,
            height: PANEL_CONTROL_HEIGHT - 2,
            padding: "0 8px",
            background: value === option.value ? "#1783ff" : "#fff",
            color: value === option.value ? "#fff" : "#263238",
            cursor: "pointer",
            font: "inherit",
            lineHeight: `${PANEL_CONTROL_HEIGHT - 2}px`,
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
      style={{
        height: PANEL_CONTROL_HEIGHT,
        background: "#fff",
        color: "#263238",
        border: "1px solid #1783ff",
        borderRadius: 0,
        font: "inherit",
      }}
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
  gap: 6,
  minHeight: 30,
  whiteSpace: "nowrap",
  flexWrap: "nowrap",
};

const colorPickerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  height: 30,
};

const presetColorGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: `repeat(${PRESET_COLOR_ROWS[0].length}, 12px)`,
  gridTemplateRows: "repeat(2, 12px)",
  gap: 2,
};

function colorSwatchStyle(color: string, selected: boolean): CSSProperties {
  return {
    width: 12,
    height: 12,
    padding: 0,
    borderRadius: 0,
    border: color === "#ffffff" ? "1px solid #8a8a8a" : "1px solid #263238",
    background: color,
    boxShadow: selected ? "0 0 0 2px #1783ff" : "none",
    cursor: "pointer",
  };
}

function customColorStyle(color: string, selected: boolean): CSSProperties {
  return {
    position: "relative",
    width: PANEL_CONTROL_HEIGHT,
    height: PANEL_CONTROL_HEIGHT,
    border: "1px solid #1783ff",
    boxSizing: "border-box",
    background: `linear-gradient(135deg, transparent calc(50% - 1px), #263238 calc(50% - 1px), #263238 calc(50% + 1px), transparent calc(50% + 1px)), ${color}`,
    boxShadow: selected ? "0 0 0 2px #1783ff" : "none",
    cursor: "pointer",
    overflow: "hidden",
  };
}

const hiddenColorInputStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  opacity: 0,
  cursor: "pointer",
};

const segmentedStyle: CSSProperties = {
  display: "flex",
  height: PANEL_CONTROL_HEIGHT,
  border: "1px solid #1783ff",
  borderRadius: 0,
  overflow: "hidden",
};

const numberInputStyle: CSSProperties = {
  width: 44,
  height: PANEL_CONTROL_HEIGHT,
  padding: "0 4px",
  background: "#fff",
  color: "#263238",
  border: "1px solid #1783ff",
  borderRadius: 0,
  font: "inherit",
};
