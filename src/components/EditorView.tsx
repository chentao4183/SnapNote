import { useActiveTool } from "../tools";
import { useSelectionTool } from "../tools/useSelectionTool";
import { useEditorShortcuts } from "../tools/useEditorShortcuts";
import { hideCurrentWindow } from "../ipc/bridge";
import { exportToFile } from "../canvas/exportCanvas";
import EditorStage from "../canvas/EditorStage";
import Toolbar from "./Toolbar";
import TextInputOverlay from "./TextInputOverlay";
import CropOverlay from "./CropOverlay";

interface Props {
  /** Called when the user hits Esc to exit the editor. */
  onExit?: () => void;
}

/**
 * The editor body: editor stage + toolbar + text-input overlays + shortcuts.
 *
 * Window-agnostic — used both by the standalone EditorWindow and by the
 * SelectorWindow's in-place "editing" mode. All tool/selection/shortcut state
 * lives in the shared Zustand stores, so this component is pure presentation.
 */
export default function EditorView({ onExit }: Props) {
  const active = useActiveTool();
  const selection = useSelectionTool();
  const closeEditor = onExit ?? (() => hideCurrentWindow());
  useEditorShortcuts({
    onExit: closeEditor,
    onSave: () => {
      void exportToFile("png");
    },
  });

  return (
    <>
      <EditorStage active={active} onEditText={selection.beginEditText} />
      <CropOverlay />
      <Toolbar onClose={closeEditor} />
      {active.kind === "smart" && active.smart.isEnteringText && active.smart.textPos && (
        <TextInputOverlay
          x={active.smart.textPos.x}
          y={active.smart.textPos.y - active.smart.style.fontSize - 12}
          initial=""
          align={active.smart.textAlign}
          background={active.smart.style.color}
          color="#ffffff"
          fontSize={active.smart.style.fontSize}
          fontFamily={active.smart.style.fontFamily}
          onSubmit={active.smart.submitText}
          onCancel={active.smart.cancelText}
        />
      )}
      {active.kind === "text" && active.text.textPos && (
        <TextInputOverlay
          x={active.text.textPos.x}
          y={active.text.textPos.y - 28}
          initial=""
          background="transparent"
          color={active.text.style.color}
          fontSize={active.text.style.fontSize}
          fontFamily={active.text.style.fontFamily}
          onSubmit={active.text.submit}
          onCancel={active.text.cancel}
        />
      )}
      {selection.editing && (
        <TextInputOverlay
          x={selection.editing.x}
          y={selection.editing.y - 28}
          initial={selection.editing.initial}
          onSubmit={selection.commitEditText}
          onCancel={selection.cancelEdit}
        />
      )}
    </>
  );
}
