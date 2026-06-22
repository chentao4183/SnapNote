import { useEffect, useRef, useState } from "react";

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
  /**
   * Horizontal inner padding. Defaults to 12 (matches the legacy input look
   * for the smart/selection overlays). Pass 10 for the transparent text tool
   * overlay so it lines up with LABEL_PAD_X in the rendered label box.
   */
  padX?: number;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export default function TextInputOverlay({
  x,
  y,
  initial,
  align = "left",
  verticalAnchor = "top",
  background = "#ff4757",
  color = "white",
  fontSize = 13,
  fontFamily = "",
  padX = 12,
  onSubmit,
  onCancel,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(initial);
  const [width, setWidth] = useState(60);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  useEffect(() => {
    if (!measureRef.current) return;
    setWidth(Math.max(60, measureRef.current.offsetWidth + padX * 2));
  }, [text, fontSize, fontFamily, padX]);

  const effectiveFontFamily = fontFamily || "system-ui, -apple-system, Segoe UI, Microsoft YaHei, sans-serif";
  const height = fontSize + 10;
  const left = align === "right" ? x - width : x;
  const top = verticalAnchor === "top" ? y : verticalAnchor === "middle" ? y - height / 2 : y - height;

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
          padding: `5px ${padX}px`,
          fontSize,
          fontFamily: effectiveFontFamily,
          fontWeight: 500,
          outline: "none",
          boxSizing: "border-box",
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
    </>
  );
}
