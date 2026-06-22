import type { Annotation } from "../types/annotation";
import type { NumberedTool, NumberingSettings } from "../types/numbering";

export interface ApplyNumberBadgeResult {
  annotation: Annotation;
  consumed: boolean;
}

/**
 * Returns a new annotation with a number badge attached when the tool's
 * auto-numbering is enabled; otherwise returns the original annotation and
 * signals that no sequence number was consumed.
 *
 * Never mutates inputs. The badge style is a fresh copy of the current global
 * style so later style changes do not retroactively alter existing badges.
 */
export function applyNumberBadgeIfEnabled(
  tool: NumberedTool,
  annotation: Annotation,
  settings: NumberingSettings,
  nextNumber: number,
): ApplyNumberBadgeResult {
  if (!settings.enabledByTool[tool]) {
    return { annotation, consumed: false };
  }

  return {
    annotation: {
      ...annotation,
      numberBadge: {
        value: nextNumber,
        style: { ...settings.badgeStyle },
      },
    },
    consumed: true,
  };
}
