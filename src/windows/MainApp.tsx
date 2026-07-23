import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { onScreenshotTriggered, onAutostartChanged, showSelectorWindow, getAutostart, setAutostart } from "../ipc/bridge";

const FIRST_RUN_KEY = "stepmark.firstRunDone";
const LEGACY_FIRST_RUN_KEY = "snapnote.firstRunDone";

export default function MainApp() {
  const [showSetup, setShowSetup] = useState(false);
  const [autostart, setAutostartState] = useState(false);

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
    <div style={{ padding: 24, fontFamily: "system-ui", color: "#222", height: "100vh", boxSizing: "border-box" }}>
      <h2 style={{ marginBottom: 8 }}>StepMark</h2>
      <p style={{ color: "#666" }}>Running in the background. Press <b>F1</b> to capture a screenshot.</p>

      {showSetup && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "#f4f6ff",
            border: "1px solid #c9d4ff",
            borderRadius: 10,
            maxWidth: 420,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Welcome to StepMark 👋</h3>
          <p style={{ color: "#555", fontSize: 14 }}>
            Capture any region with <b>F1</b>, annotate it with smart labels, arrows, mosaic, and more — then copy or
            save in one click.
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, margin: "12px 0" }}>
            <input type="checkbox" checked={autostart} onChange={(e) => toggleAutostart(e.target.checked)} />
            Launch StepMark when I log in
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
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
