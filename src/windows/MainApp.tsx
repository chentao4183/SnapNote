import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  onScreenshotTriggered,
  onAutostartChanged,
  showSelectorWindow,
  getAutostart,
  setAutostart,
  setScreenshotShortcut,
} from "../ipc/bridge";
import { DEFAULT_SCREENSHOT_SHORTCUT, useSettingsStore } from "../store/settingsStore";

const FIRST_RUN_KEY = "stepmark.firstRunDone";
const LEGACY_FIRST_RUN_KEY = "snapnote.firstRunDone";

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

/** Human-readable label for a stored shortcut string (for display in UI). */
function shortcutLabel(shortcut: string): string {
  return shortcut
    .split("+")
    .map((tok) => {
      if (tok === "Ctrl") return "Ctrl";
      if (tok === "Shift") return "Shift";
      if (tok === "Alt") return "Alt";
      if (tok === "Super") return "Win";
      // KeyA -> A, Digit1 -> 1, F1 -> F1, keep others as-is.
      if (/^Key[A-Z]$/.test(tok)) return tok.slice(3);
      if (/^Digit[0-9]$/.test(tok)) return tok.slice(5);
      return tok;
    })
    .join(" + ");
}

export default function MainApp() {
  const [showSetup, setShowSetup] = useState(false);
  const [autostart, setAutostartState] = useState(false);
  // The persisted (source-of-truth) shortcut from settingsStore.
  const shortcut = useSettingsStore((s) => s.settings.screenshotShortcut);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  // Draft shortcut while the user is recording a new key combo, plus status.
  const [draft, setDraft] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  useEffect(() => {
    // Migrate the legacy first-run flag once (pre-rename users shouldn't see the wizard again).
    if (!localStorage.getItem(FIRST_RUN_KEY) && localStorage.getItem(LEGACY_FIRST_RUN_KEY)) {
      localStorage.setItem(FIRST_RUN_KEY, localStorage.getItem(LEGACY_FIRST_RUN_KEY)!);
      localStorage.removeItem(LEGACY_FIRST_RUN_KEY);
    }
    // Show the first-run setup on the very first launch only.
    if (!localStorage.getItem(FIRST_RUN_KEY)) {
      setShowSetup(true);
      const win = getCurrentWebviewWindow();
      void win.show().then(() => win.setFocus());
    }
    // Reflect current autostart state.
    getAutostart().then(setAutostartState).catch(() => {});

    // Swap the startup default (F1) for the user's persisted custom shortcut,
    // if any. Rust registers F1 at startup, so this is an incremental swap
    // that only fires when the user actually changed the key.
    const stored = useSettingsStore.getState().settings.screenshotShortcut;
    if (stored && stored !== DEFAULT_SCREENSHOT_SHORTCUT) {
      void setScreenshotShortcut(stored).catch((err: unknown) => {
        console.warn("Failed to apply persisted shortcut at startup", err);
      });
    }

    const unlisten = onScreenshotTriggered(() => {
      showSelectorWindow();
    });
    // Keep the checkbox in sync when toggled from the tray menu.
    const unlistenAutostart = onAutostartChanged((enabled) => {
      setAutostartState(enabled);
    });
    return () => {
      unlisten.then((fn) => fn());
      unlistenAutostart.then((fn) => fn());
    };
  }, []);

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

  function resetShortcut() {
    setDraft(null);
    setShortcutError(null);
    setRecording(false);
  }

  async function toggleAutostart(v: boolean) {
    setAutostartState(v);
    try {
      await setAutostart(v);
    } catch {
      setAutostartState(!v);
    }
  }

  function finishSetup() {
    localStorage.setItem(FIRST_RUN_KEY, "1");
    setShowSetup(false);
    void getCurrentWebviewWindow().hide();
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", color: "#222", height: "100vh", boxSizing: "border-box", overflowY: "auto" }}>
      <h2 style={{ marginBottom: 8 }}>关于 StepMark</h2>
      <p style={{ color: "#666", marginTop: 0 }}>
        Windows 桌面截图批注工具，驻留系统托盘，按 <b>{shortcutLabel(shortcut)}</b> 随时截图。
      </p>

      {showSetup && (
        <div
          style={{
            marginBottom: 20,
            padding: "10px 16px",
            background: "#f4f6ff",
            border: "1px solid #c9d4ff",
            borderRadius: 8,
            color: "#3a4a8f",
            fontSize: 14,
          }}
        >
          👋 首次使用 StepMark？请先阅读以下说明。
        </div>
      )}

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 8 }}>产品简介</h3>
        <p style={{ color: "#444", lineHeight: 1.7, marginTop: 0 }}>
          StepMark 的核心是<b>智能标注</b>：在截图上拖拽一次，一步生成「目标框 + 箭头 + 文字标签」组合，
          不需要分别切换矩形、箭头、文字工具。适合日常问题反馈、需求评审、文档教程截图。
        </p>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 8 }}>截图流程</h3>
        <ol style={{ color: "#444", lineHeight: 1.9, paddingLeft: 20, margin: 0 }}>
          <li>
            按 <b>{shortcutLabel(shortcut)}</b>（或左键单击托盘图标），进入屏幕框选模式。
          </li>
          <li>拖动鼠标框选要截取的区域，松开后自动进入编辑器。</li>
          <li>
            在编辑器里批注：智能标注一步生成组合，也可单独使用矩形、箭头、文字、马赛克。
          </li>
          <li>完成后点击「复制」送入剪贴板，或点击「保存」导出为 PNG / JPG。</li>
        </ol>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 8 }}>截图快捷键</h3>
        <p style={{ color: "#666", fontSize: 14, marginTop: 0, marginBottom: 12 }}>
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
              onClick={resetShortcut}
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
                onClick={resetShortcut}
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
        {shortcutError && (
          <p style={{ color: "#d4380d", fontSize: 13, marginTop: 8 }}>{shortcutError}</p>
        )}
      </section>

      {showSetup && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "#f7f8fa",
            border: "1px solid #e3e6eb",
            borderRadius: 10,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 12 }}>
            <input type="checkbox" checked={autostart} onChange={(e) => toggleAutostart(e.target.checked)} />
            开机时自动启动 StepMark
          </label>
          <button
            onClick={finishSetup}
            style={{
              background: "#5b6cff",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            我知道了
          </button>
        </div>
      )}
    </div>
  );
}
