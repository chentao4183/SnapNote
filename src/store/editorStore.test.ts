import { describe, expect, it } from "vitest";
import { useEditorStore } from "./editorStore";
import type { Annotation } from "../types/annotation";

function makeAnnotation(id: string): Annotation {
  return {
    id,
    type: "rect",
    rect: { x: 0, y: 0, width: 10, height: 10 },
    style: {
      borderColor: "#ff4757",
      borderWidth: 3,
      bgColor: "#ff4757",
      textColor: "#ffffff",
      fontSize: 13,
    },
  };
}

describe("useEditorStore numbering sequence", () => {
  it("starts nextNumber at 1 after init", () => {
    useEditorStore.getState().init("bg", { x: 0, y: 0, width: 100, height: 100 });
    expect(useEditorStore.getState().nextNumber).toBe(1);
  });

  it("increments nextNumber only when a number is consumed", () => {
    useEditorStore.getState().init("bg", { x: 0, y: 0, width: 100, height: 100 });

    useEditorStore.getState().addAnnotation(makeAnnotation("a"), { consumedNumber: true });
    expect(useEditorStore.getState().nextNumber).toBe(2);

    useEditorStore.getState().addAnnotation(makeAnnotation("b"));
    expect(useEditorStore.getState().nextNumber).toBe(2);
  });

  it("undo restores nextNumber to the pre-creation value", () => {
    useEditorStore.getState().init("bg", { x: 0, y: 0, width: 100, height: 100 });
    useEditorStore.getState().addAnnotation(makeAnnotation("a"), { consumedNumber: true });
    useEditorStore.getState().addAnnotation(makeAnnotation("b"), { consumedNumber: true });
    expect(useEditorStore.getState().nextNumber).toBe(3);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().nextNumber).toBe(2);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().nextNumber).toBe(1);
  });

  it("redo restores the original nextNumber", () => {
    useEditorStore.getState().init("bg", { x: 0, y: 0, width: 100, height: 100 });
    useEditorStore.getState().addAnnotation(makeAnnotation("a"), { consumedNumber: true });
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().nextNumber).toBe(1);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().nextNumber).toBe(2);
    expect(useEditorStore.getState().annotations).toHaveLength(1);
  });

  it("removeAnnotation and updateAnnotation do not change nextNumber", () => {
    useEditorStore.getState().init("bg", { x: 0, y: 0, width: 100, height: 100 });
    useEditorStore.getState().addAnnotation(makeAnnotation("a"), { consumedNumber: true });
    expect(useEditorStore.getState().nextNumber).toBe(2);

    useEditorStore.getState().updateAnnotation("a", { note: "hi" });
    expect(useEditorStore.getState().nextNumber).toBe(2);

    useEditorStore.getState().removeAnnotation("a");
    expect(useEditorStore.getState().nextNumber).toBe(2);
  });

  it("resetNextNumber sets future number to 1 without altering existing annotations or history", () => {
    useEditorStore.getState().init("bg", { x: 0, y: 0, width: 100, height: 100 });
    useEditorStore.getState().addAnnotation(makeAnnotation("a"), { consumedNumber: true });
    useEditorStore.getState().resetNextNumber();

    expect(useEditorStore.getState().nextNumber).toBe(1);
    expect(useEditorStore.getState().annotations).toHaveLength(1);
    // undo should NOT roll back the reset (it must not be in history)
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().nextNumber).toBe(1);
  });
});
