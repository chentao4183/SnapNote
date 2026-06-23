import type { NumberBadge } from "../types/annotation";
import type { NumberedTool, NumberingSettings } from "../types/numbering";

export function pendingNumberBadgeForTool(
  tool: NumberedTool,
  settings: NumberingSettings,
  nextNumber: number,
): NumberBadge | null {
  if (!settings.enabledByTool[tool]) return null;
  return {
    value: nextNumber,
    style: { ...settings.badgeStyle },
  };
}
