import { useEffect, useRef, useState } from "react";

interface Props {
  x: number;
  y: number;
  initial: string;
  align?: "left" | "right";
  background?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export default function TextInputOverlay({
  x,
  y,
  initial,
  align = "left",
  background = "#ff4757",
  color = "white",
  fontSize = 13,
  fontFamily = "",
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
    setWidth(Math.max(60, measureRef.current.offsetWidth + 24));
  }, [text, fontSize, fontFamily]);

  const effectiveFontFamily = fontFamily || "system-ui, -apple-system, Segoe UI, Microsoft YaHei, sans-serif";
  const left = align === "right" ? x - width : x;

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
          top: y,
          width,
          background,
          color,
          border: "none",
          borderRadius: 4,
          padding: "5px 12px",
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
