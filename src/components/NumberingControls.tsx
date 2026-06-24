import type { CSSProperties } from "react";
import { useEditorStore } from "../store/editorStore";
import { useNumberingStore } from "../store/numberingStore";
import { useToolStyleStore } from "../store/toolStyleStore";
import type { SmartShapeKind } from "../types/annotation";
import { BADGE_FONT_SIZE_LIMITS } from "../types/numbering";
import type {
  ArrowBadgePosition,
  EllipseBadgePosition,
  NumberedTool,
  RectBadgePosition,
  SmartBadgeAnchor,
  TextBadgePosition,
} from "../types/numbering";

// Two rows of four swatches, matching the StylePanel ColorPicker grid so the
// numbering color picker looks consistent with the tool color picker.
const BADGE_COLOR_ROWS = [
  ["#ff4757", "#1890ff", "#52c41a", "#faad14"],
  ["#722ed1", "#000000", "#ffffff", "#fa8c16"],
];
const PANEL_CONTROL_HEIGHT = 26;

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
          style={{ width: 14, height: 14, accentColor: "#1783ff", cursor: "pointer" }}
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
  shape: SmartShapeKind;
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
        shape === "none" && (
          <Segmented
            value={placement.labelPosition}
            options={[
              { label: "左", value: "left" },
              { label: "右", value: "right" },
            ]}
            onChange={(value) => onChange({ labelPosition: value })}
          />
        )}
      {placement.anchor === "target" &&
        shape !== "none" &&
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
  style: { color: string; shape: "square" | "rounded" | "circle"; fontSize: number };
  onChange: (patch: Partial<{ color: string; shape: "square" | "rounded" | "circle"; fontSize: number }>) => void;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, minHeight: PANEL_CONTROL_HEIGHT }}>
      <span style={badgeColorGridStyle} title="编号颜色">
        {BADGE_COLOR_ROWS.map((row) =>
          row.map((color) => (
            <button
              key={color}
              onClick={() => onChange({ color })}
              style={{
                width: 12,
                height: 12,
                padding: 0,
                borderRadius: 0,
                border: color === "#ffffff" ? "1px solid #8a8a8a" : "1px solid #263238",
                background: color,
                boxShadow: style.color === color ? "0 0 0 2px #1783ff" : "none",
                cursor: "pointer",
              }}
            />
          )),
        )}
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
      <label style={{ display: "flex", alignItems: "center", gap: 3, height: PANEL_CONTROL_HEIGHT }}>
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
          style={numberInputStyle}
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
    <div style={segmentedStyle}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          style={{
            border: "none",
            minWidth: 28,
            height: PANEL_CONTROL_HEIGHT - 2,
            padding: "0 7px",
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

const toggleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  height: PANEL_CONTROL_HEIGHT,
  marginLeft: 6,
  paddingLeft: 6,
  borderLeft: "1px solid #cfd8dc",
  cursor: "pointer",
};

const detailsRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minHeight: 30,
  paddingTop: 4,
  borderTop: "1px solid #d8e3ea",
  whiteSpace: "nowrap",
};

const resetButtonStyle: CSSProperties = {
  height: PANEL_CONTROL_HEIGHT,
  padding: "0 8px",
  background: "#fff",
  color: "#263238",
  border: "1px solid #1783ff",
  borderRadius: 0,
  cursor: "pointer",
  font: "inherit",
};

const segmentedStyle: CSSProperties = {
  display: "inline-flex",
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

// 4-column, 2-row grid matching StylePanel's presetColorGridStyle so the
// numbering color swatches line up with the tool color swatches.
const badgeColorGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: `repeat(${BADGE_COLOR_ROWS[0].length}, 12px)`,
  gridTemplateRows: "repeat(2, 12px)",
  gap: 2,
};
