import { create } from "zustand";

/**
 * Default screenshot shortcut. Matches the Rust-side default.
 */
export const DEFAULT_SCREENSHOT_SHORTCUT = "F1";

export interface Settings {
  /** Global screenshot shortcut in global-hotkey string form (e.g. "F1", "Ctrl+Shift+KeyA"). */
  screenshotShortcut: string;
}

interface SettingsState {
  settings: Settings;
  /** Replace the whole settings object (e.g. after loading from the Rust backend). */
  setSettings: (settings: Settings) => void;
  /** Patch one or more fields (no persistence — persistence is the Rust side's job). */
  updateSettings: (patch: Partial<Settings>) => void;
}

/**
 * Human-readable label for a stored shortcut string (e.g. "Ctrl+Shift+KeyA" -> "Ctrl + Shift + A").
 */
export function shortcutLabel(shortcut: string): string {
  return shortcut
    .split("+")
    .map((tok) => {
      if (tok === "Ctrl") return "Ctrl";
      if (tok === "Shift") return "Shift";
      if (tok === "Alt") return "Alt";
      if (tok === "Super") return "Win";
      if (/^Key[A-Z]$/.test(tok)) return tok.slice(3);
      if (/^Digit[0-9]$/.test(tok)) return tok.slice(5);
      return tok;
    })
    .join(" + ");
}

/**
 * In-memory mirror of the persisted settings. The single source of truth is
 * the Rust-side settings.json (read/written via the shortcut commands),
 * because Tauri webview localStorage is partitioned per window on Windows and
 * cannot reliably share data between the main window and the shortcut-settings
 * window. Windows that need the current value must call loadFromBackend() on
 * mount to refresh this store from Rust.
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { screenshotShortcut: DEFAULT_SCREENSHOT_SHORTCUT },
  setSettings: (settings) => set({ settings }),
  updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
}));
