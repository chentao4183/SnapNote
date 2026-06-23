import type { CSSProperties } from "react";
import { useEditorStore } from "../store/editorStore";
import { useNumberingStore } from "../store/numberingStore";
import { useToolStyleStore } from "../store/toolStyleStore";
import { BADGE_FONT_SIZE_LIMITS } from "../types/numbering";
import type {
  ArrowBadgePosition,
  EllipseBadgePosition,
  NumberedTool,
  RectBadgePosition,
  SmartBadgeAnchor,
  TextBadgePosition,
} from "../types/numbering";

const BADGE_COLORS = ["#ff4757", "#1890ff", "#52c41a", "#faad14", "#722ed1", "#000000", "#ffffff", "#fa8c16"];

type NumberingControlsMode = "toggle" | "details";

interface Props {
  tool: NumberedTool;
  mode?: NumberingControlsMode;
}

/**
 * Per-tool numbering controls for StylePanel.
 *
 * The panel renders this component twice:
 * - mode="toggle": first row, after the tool's base style controls.
 * - mode="details": second row, only when automatic numbering is enabled.
 */
export default function NumberingControls({ tool, mode = "details" }: Props) {
  const settings = useNumberingStore((s) => s.settings);
  const updateEnabled = useNumberingStore((s) => s.updateEnabled);
  const updateToolPlacement = useNumberingStore((s) => s.updateToolPlacement);
  const updateBadgeStyle = useNumberingStore((s) => s.updateBadgeStyle);
  const resetNextNumber = useEditorStore((s) => s.resetNextNumber);
  const rectShape = useToolStyleStore((s) => s.settings.rect.shape);
  const smartShape = useToolStyleStore((s) => s.settings.smart.shape);
  const enabled = settings.enabledByTool[tool];

  if (mode === "toggle") {
    return (
      <label style={toggleStyle}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => updateEnabled(tool, e.target.checked)}
          style={{ accentColor: "#1783ff", cursor: "pointer" }}
        />
        <span>自动编号</span>
      </label>
    );
  }

  if (!enabled) return null;

  return (
    <div style={detailsRowStyle}>
      {tool === "smart" && (
        <SmartPositionControls
          placement={settings.positionByTool.smart}
          shape={smartShape}
          onChange={(patch) => updateToolPlacement("smart", { ...settings.positionByTool.smart, ...patch })}
        />
      )}
      {tool === "rect" && (
        <RectPositionControls
          placement={settings.positionByTool.rect}
          shape={rectShape}
          onChange={(patch) => updateToolPlacement("rect", { ...settings.positionByTool.rect, ...patch })}
        />
      )}
      {tool === "arrow" && (
        <Segmented
          value={settings.positionByTool.arrow}
          options={[
            { label: "起点", value: "start" },
            { label: "中点", value: "middle" },
            { label: "终点", value: "end" },
          ]}
          onChange={(value) => updateToolPlacement("arrow", value)}
        />
      )}
      {tool === "text" && (
        <Segmented
          value={settings.positionByTool.text}
          options={[
            { label: "左", value: "left" },
            { label: "右", value: "right" },
          ]}
          onChange={(value) => updateToolPlacement("text", value)}
        />
      )}

      <BadgeStyleControls style={settings.badgeStyle} onChange={updateBadgeStyle} />
      <button onClick={resetNextNumber} style={resetButtonStyle} title="仅影响之后新建的编号">
        重置编号为 1
      </button>
    </div>
  );
}

function SmartPositionControls({
  placement,
  shape,
  onChange,
}: {
  placement: {
    anchor: SmartBadgeAnchor;
    targetRectPosition: RectBadgePosition;
    targetEllipsePosition: EllipseBadgePosition;
    arrowPosition: ArrowBadgePosition;
    labelPosition: TextBadgePosition;
  };
  shape: "rect" | "ellipse";
  onChange: (patch: Partial<{
    anchor: SmartBadgeAnchor;
    targetRectPosition: RectBadgePosition;
    targetEllipsePosition: EllipseBadgePosition;
    arrowPosition: ArrowBadgePosition;
    labelPosition: TextBadgePosition;
  }>) => void;
}) {
  return (
    <>
      <Segmented
        value={placement.anchor}
        options={[
          { label: "目标", value: "target" },
          { label: "箭头", value: "arrow" },
          { label: "文本", value: "label" },
        ]}
        onChange={(value) => onChange({ anchor: value })}
      />
      {placement.anchor === "target" &&
        (shape === "ellipse" ? (
          <Segmented
            value={placement.targetEllipsePosition}
            options={[
              { label: "左", value: "left" },
              { label: "右", value: "right" },
              { label: "上", value: "top" },
              { label: "下", value: "bottom" },
              { label: "居中", value: "center" },
            ]}
            onChange={(value) => onChange({ targetEllipsePosition: value })}
          />
        ) : (
          <Segmented
            value={placement.targetRectPosition}
            options={[
              { label: "左上", value: "top-left" },
              { label: "右上", value: "top-right" },
              { label: "左下", value: "bottom-left" },
              { label: "右下", value: "bottom-right" },
              { label: "居中", value: "center" },
            ]}
            onChange={(value) => onChange({ targetRectPosition: value })}
          />
        ))}
      {placement.anchor === "arrow" && (
        <Segmented
          value={placement.arrowPosition}
          options={[
            { label: "起点", value: "start" },
            { label: "中点", value: "middle" },
            { label: "终点", value: "end" },
          ]}
          onChange={(value) => onChange({ arrowPosition: value })}
        />
      )}
      {placement.anchor === "label" && (
        <Segmented
          value={placement.labelPosition}
          options={[
            { label: "左", value: "left" },
            { label: "右", value: "right" },
          ]}
          onChange={(value) => onChange({ labelPosition: value })}
        />
      )}
    </>
  );
}

function RectPositionControls({
  placement,
  shape,
  onChange,
}: {
  placement: { rectPosition: RectBadgePosition; ellipsePosition: EllipseBadgePosition };
  shape: "rect" | "ellipse";
  onChange: (patch: Partial<{ rectPosition: RectBadgePosition; ellipsePosition: EllipseBadgePosition }>) => void;
}) {
  if (shape === "ellipse") {
    return (
      <Segmented
        value={placement.ellipsePosition}
        options={[
          { label: "左", value: "left" },
          { label: "右", value: "right" },
          { label: "上", value: "top" },
          { label: "下", value: "bottom" },
          { label: "居中", value: "center" },
        ]}
        onChange={(value) => onChange({ ellipsePosition: value })}
      />
    );
  }

  return (
    <Segmented
      value={placement.rectPosition}
      options={[
        { label: "左上", value: "top-left" },
        { label: "右上", value: "top-right" },
        { label: "左下", value: "bottom-left" },
        { label: "右下", value: "bottom-right" },
        { label: "居中", value: "center" },
      ]}
      onChange={(value) => onChange({ rectPosition: value })}
    />
  );
}

function BadgeStyleControls({
  style,
  onChange,
}: {
  style: { bgColor: string; textColor: string; shape: "square" | "rounded" | "circle"; fontSize: number };
  onChange: (patch: Partial<{ bgColor: string; textColor: string; shape: "square" | "rounded" | "circle"; fontSize: number }>) => void;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }} title="背景色">
        {BADGE_COLORS.map((color) => (
          <button
            key={`bg-${color}`}
            onClick={() => onChange({ bgColor: color })}
            style={{
              width: 14,
              height: 14,
              padding: 0,
              borderRadius: 2,
              border: style.bgColor === color ? "2px solid #1783ff" : "1px solid #455a64",
              background: color,
              cursor: "pointer",
            }}
          />
        ))}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }} title="编号色">
        <button
          onClick={() => onChange({ textColor: "#ffffff" })}
          style={{
            width: 14,
            height: 14,
            padding: 0,
            borderRadius: 2,
            border: style.textColor === "#ffffff" ? "2px solid #1783ff" : "1px solid #455a64",
            background: "#ffffff",
            cursor: "pointer",
          }}
        />
        <button
          onClick={() => onChange({ textColor: "#000000" })}
          style={{
            width: 14,
            height: 14,
            padding: 0,
            borderRadius: 2,
            border: style.textColor === "#000000" ? "2px solid #1783ff" : "1px solid #455a64",
            background: "#000000",
            cursor: "pointer",
          }}
        />
      </span>
      <Segmented
        value={style.shape}
        options={[
          { label: "方", value: "square" },
          { label: "圆角", value: "rounded" },
          { label: "圆", value: "circle" },
        ]}
        onChange={(value) => onChange({ shape: value })}
      />
      <label style={{ display: "flex", alignItems: "center", gap: 3 }}>
        <span>字号</span>
        <input
          type="number"
          min={BADGE_FONT_SIZE_LIMITS.min}
          max={BADGE_FONT_SIZE_LIMITS.max}
          value={style.fontSize}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isInteger(n)) {
              onChange({ fontSize: Math.min(BADGE_FONT_SIZE_LIMITS.max, Math.max(BADGE_FONT_SIZE_LIMITS.min, n)) });
            }
          }}
          style={{ width: 38, background: "#fff", color: "#263238", border: "1px solid #1783ff", borderRadius: 0 }}
        />
      </label>
    </span>
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
    <div style={{ display: "inline-flex", border: "1px solid #1783ff", borderRadius: 0, overflow: "hidden" }}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          style={{
            border: "none",
            padding: "2px 6px",
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

const toggleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  marginLeft: 6,
  paddingLeft: 6,
  borderLeft: "1px solid #cfd8dc",
  cursor: "pointer",
};

const detailsRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  paddingTop: 4,
  borderTop: "1px solid #d8e3ea",
  whiteSpace: "nowrap",
};

const resetButtonStyle: CSSProperties = {
  padding: "2px 6px",
  background: "#fff",
  color: "#263238",
  border: "1px solid #1783ff",
  borderRadius: 0,
  cursor: "pointer",
};
