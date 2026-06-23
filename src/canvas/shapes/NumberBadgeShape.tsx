import { Circle, Rect, Text } from "react-konva";
import type { NumberBadge, Rect as RectType } from "../../types/annotation";
import { labelFontFamily } from "../labelMetrics";

interface Props {
  badge: NumberBadge;
  box: RectType;
}

/**
 * Renders a number badge inside the given source-space rect. The box already
 * encodes the chosen placement and shape sizing, so this component only draws.
 *
 * - square: Rect, cornerRadius 0
 * - rounded: Rect, cornerRadius 4
 * - circle: Circle with radius = min(width, height) / 2
 *
 * Text is centered with the badge's own style. No border is drawn.
 */
export default function NumberBadgeShape({ badge, box }: Props) {
  const { style, value } = badge;
  const text = String(value);
  const fontFamily = labelFontFamily(undefined);

  if (style.shape === "circle") {
    const radius = Math.min(box.width, box.height) / 2;
    return (
      <>
        <Circle
          x={box.x + box.width / 2}
          y={box.y + box.height / 2}
          radius={radius}
          fill={style.bgColor}
          listening={false}
        />
        <Text
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          align="center"
          verticalAlign="middle"
          text={text}
          fontSize={style.fontSize}
          fontFamily={fontFamily}
          fill={style.textColor}
          listening={false}
        />
      </>
    );
  }

  const cornerRadius = style.shape === "rounded" ? 4 : 0;
  return (
    <>
      <Rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill={style.bgColor}
        cornerRadius={cornerRadius}
        listening={false}
      />
      <Text
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        align="center"
        verticalAlign="middle"
        text={text}
        fontSize={style.fontSize}
        fontFamily={fontFamily}
        fill={style.textColor}
        listening={false}
      />
    </>
  );
}
