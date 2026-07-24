import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  onScreenshotTriggered,
  onAutostartChanged,
  onShortcutChanged,
  showSelectorWindow,
  getAutostart,
  setAutostart,
  getScreenshotShortcut,
  initScreenshotShortcut,
} from "../ipc/bridge";
import { shortcutLabel, useSettingsStore } from "../store/settingsStore";

const FIRST_RUN_KEY = "stepmark.firstRunDone";
const LEGACY_FIRST_RUN_KEY = "snapnote.firstRunDone";

export default function MainApp() {
  const [showSetup, setShowSetup] = useState(false);
  const [autostart, setAutostartState] = useState(false);
  // The persisted (source-of-truth) shortcut from settingsStore, shown in the copy.
  const shortcut = useSettingsStore((s) => s.settings.screenshotShortcut);

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

    // Register the screenshot shortcut from Rust's persisted settings.json,
    // then read the active value back so the about page shows the right key.
    // Rust registers nothing at startup; this is the single registration path.
    void (async () => {
      try {
        await initScreenshotShortcut();
        const key = await getScreenshotShortcut();
        useSettingsStore.getState().setSettings({ screenshotShortcut: key });
      } catch (err) {
        console.warn("Failed to init screenshot shortcut", err);
      }
    })();

    // The shortcut-settings window persists changes on the Rust side; refresh
    // our in-memory mirror when it notifies us.
    const unlistenShortcut = onShortcutChanged((key) => {
      useSettingsStore.getState().setSettings({ screenshotShortcut: key });
    });

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
      unlistenShortcut.then((fn) => fn());
    };
  }, []);

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
        <p style={{ color: "#444", lineHeight: 1.7, marginTop: 0 }}>
          当前：<b>{shortcutLabel(shortcut)}</b>。可在「设置 ▶ 快捷键」中修改。
        </p>
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
