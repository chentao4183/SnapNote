import { useEffect, useRef } from "react";

interface Props {
  x: number;
  y: number;
  initial: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export default function TextInputOverlay({ x, y, initial, onSubmit, onCancel }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      defaultValue={initial}
      style={{
        position: "absolute",
        left: x,
        top: y,
        background: "#ff4757",
        color: "white",
        border: "none",
        borderRadius: 4,
        padding: "5px 12px",
        fontSize: 13,
        fontFamily: "inherit",
        outline: "none",
        minWidth: 60,
        zIndex: 100,
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSubmit(ref.current?.value || "");
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onSubmit(ref.current?.value || "")}
    />
  );
}
