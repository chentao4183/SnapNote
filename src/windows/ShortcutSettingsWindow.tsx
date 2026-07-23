import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { setScreenshotShortcut } from "../ipc/bridge";
import { shortcutLabel, useSettingsStore } from "../store/settingsStore";

/**
 * Format a key combo into a global-hotkey string the Rust register accepts.
 * `code` is the main key (e.g. "KeyA", "F1", "Digit1") matching the
 * global_hotkey::Code enum names; modifiers are listed first in the
 * canonical Ctrl/Shift/Alt/Super order.
 */
function formatShortcut(code: string, mods: { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean }): string {
  const parts: string[] = [];
  if (mods.ctrl) parts.push("Ctrl");
  if (mods.shift) parts.push("Shift");
  if (mods.alt) parts.push("Alt");
  if (mods.meta) parts.push("Super");
  parts.push(code);
  return parts.join("+");
}

export default function ShortcutSettingsWindow() {
  const shortcut = useSettingsStore((s) => s.settings.screenshotShortcut);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  // Draft shortcut while the user is recording a new key combo, plus status.
  const [draft, setDraft] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  function onKeyDownRecord(e: ReactKeyboardEvent) {
    // Ignore pure-modifier presses so the user can finish composing the combo.
    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;
    e.preventDefault();
    const combo = formatShortcut(e.code, { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey });
    setDraft(combo);
    setRecording(false);
  }

  async function saveShortcut() {
    if (!draft) return;
    setShortcutError(null);
    try {
      await setScreenshotShortcut(draft);
      updateSettings({ screenshotShortcut: draft });
      setDraft(null);
    } catch (err: unknown) {
      setShortcutError(typeof err === "string" ? err : "保存失败，请换一组组合键再试");
    }
  }

  function resetDraft() {
    setDraft(null);
    setShortcutError(null);
    setRecording(false);
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", color: "#222", height: "100vh", boxSizing: "border-box" }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>截图快捷键</h3>
      <p style={{ color: "#666", fontSize: 14, margin: "0 0 16px" }}>
        当前：<b>{shortcutLabel(shortcut)}</b>
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => {
            setDraft(null);
            setShortcutError(null);
            setRecording(true);
          }}
          disabled={recording}
          style={{
            background: recording ? "#e3e6eb" : "#fff",
            color: "#222",
            border: "1px solid #c4c9d4",
            borderRadius: 6,
            padding: "6px 14px",
            cursor: recording ? "default" : "pointer",
            fontSize: 14,
          }}
        >
          {recording ? "请按下组合键…" : "修改快捷键"}
        </button>
        {recording && (
          <button
            onClick={resetDraft}
            style={{
              background: "transparent",
              color: "#666",
              border: "1px solid #c4c9d4",
              borderRadius: 6,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            取消
          </button>
        )}
        {recording && (
          <input
            autoFocus
            readOnly
            value=""
            onKeyDown={onKeyDownRecord}
            placeholder="按下任意组合键…"
            style={{
              border: "1px solid #5b6cff",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 14,
              width: 160,
              color: "#999",
            }}
          />
        )}
        {!recording && draft && (
          <>
            <span style={{ fontSize: 14, color: "#222" }}>新组合：{shortcutLabel(draft)}</span>
            <button
              onClick={saveShortcut}
              style={{
                background: "#5b6cff",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              保存
            </button>
            <button
              onClick={resetDraft}
              style={{
                background: "transparent",
                color: "#666",
                border: "1px solid #c4c9d4",
                borderRadius: 6,
                padding: "6px 14px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              取消
            </button>
          </>
        )}
      </div>
      {shortcutError && <p style={{ color: "#d4380d", fontSize: 13, marginTop: 12 }}>{shortcutError}</p>}
    </div>
  );
}
