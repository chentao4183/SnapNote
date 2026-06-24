import { useEffect, useRef, useState } from "react";
import { measureNumberBadge } from "../geometry/numberBadge";
import type { NumberBadge } from "../types/annotation";
import type { TextBadgePosition } from "../types/numbering";
import { measureBadgeTextWidth } from "../canvas/badgeText";
import { labelBoxLayoutFromTextWidth } from "../canvas/labelMetrics";

interface Props {
  x: number;
  y: number;
  initial: string;
  align?: "left" | "right";
  verticalAnchor?: "top" | "middle" | "bottom";
  background?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  numberBadge?: NumberBadge | null;
  numberBadgePosition?: TextBadgePosition;
  /**
   * Horizontal inner padding. Defaults to 12 (matches the legacy input look
   * for the smart/selection overlays). Pass 10 for the transparent text tool
   * overlay so it lines up with LABEL_PAD_X in the rendered label box.
   */
  padX?: number;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

const METRIC_STYLE = {
  borderColor: "",
  borderWidth: 0,
  bgColor: "",
  textColor: "",
};

export default function TextInputOverlay({
  x,
  y,
  initial,
  align = "left",
  verticalAnchor = "top",
  background = "#ff4757",
  color = "white",
  fontSize = 17,
  fontFamily = "",
  numberBadge = null,
  numberBadgePosition = "left",
  padX = 12,
  onSubmit,
  onCancel,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(initial);
  const [textWidth, setTextWidth] = useState(40);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  useEffect(() => {
    if (!measureRef.current) return;
    setTextWidth(Math.max(40, measureRef.current.offsetWidth));
  }, [text, fontSize, fontFamily, padX]);

  const effectiveFontFamily = fontFamily || "system-ui, -apple-system, Segoe UI, Microsoft YaHei, sans-serif";
  const badgeSize = numberBadge ? measureNumberBadge(numberBadge.value, numberBadge.style, measureBadgeTextWidth) : null;
  const layout = badgeSize
    ? labelBoxLayoutFromTextWidth(textWidth, { ...METRIC_STYLE, fontSize }, { box: badgeSize, position: numberBadgePosition })
    : null;
  const width = layout ? layout.width : Math.max(60, textWidth + padX * 2);
  const height = layout ? layout.height : fontSize + 10;
  const left = align === "right" ? x - width : x;
  const top = verticalAnchor === "top" ? y : verticalAnchor === "middle" ? y - height / 2 : y - height;
  const paddingLeft = layout ? layout.textX : padX;
  const paddingRight =
    layout && layout.badgeBox && numberBadgePosition === "right" ? width - layout.badgeBox.x : padX;
  const paddingTop = layout ? layout.textY : 5;
  const paddingBottom = Math.max(0, height - paddingTop - fontSize);
  const numberBadgeColor = numberBadge
    ? numberBadge.style.color ?? (numberBadge.style as { bgColor?: string }).bgColor ?? "#ff4757"
    : undefined;

  return (
    <>
      <span
        ref={measureRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          whiteSpace: "pre",
          fontSize,
          fontFamily: effectiveFontFamily,
          fontWeight: 500,
          pointerEvents: "none",
        }}
      >
        {text || " "}
      </span>
      <input
        ref={ref}
        value={text}
        style={{
          position: "absolute",
          left,
          top,
          width,
          height,
          background,
          color,
          border: "none",
          borderRadius: 4,
          paddingTop,
          paddingRight,
          paddingBottom,
          paddingLeft,
          fontSize,
          fontFamily: effectiveFontFamily,
          fontWeight: 500,
          outline: "none",
          boxSizing: "border-box",
          lineHeight: `${fontSize}px`,
          textAlign: align,
          zIndex: 100,
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit(text);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={() => onSubmit(text)}
      />
      {numberBadge && layout?.badgeBox && (
        <span
          style={{
            position: "absolute",
            left: left + layout.badgeBox.x,
            top: top + layout.badgeBox.y,
            width: layout.badgeBox.width,
            height: layout.badgeBox.height,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            color: numberBadgeColor,
            border: `2px solid ${numberBadgeColor}`,
            boxSizing: "border-box",
            borderRadius:
              numberBadge.style.shape === "circle" ? "999px" : numberBadge.style.shape === "rounded" ? 4 : 0,
            fontSize: numberBadge.style.fontSize,
            fontFamily: effectiveFontFamily,
            fontWeight: 500,
            lineHeight: `${numberBadge.style.fontSize}px`,
            pointerEvents: "none",
            zIndex: 101,
          }}
        >
          {numberBadge.value}
        </span>
      )}
    </>
  );
}
