import { create } from "zustand";

export const SETTINGS_STORAGE_KEY = "stepmark.settings.v1";

// Previous name (pre-rename). Kept only to migrate existing users once.
const LEGACY_SETTINGS_STORAGE_KEY = "snapnote.settings.v1";

/** Default screenshot shortcut. Matches the Rust-side default registered at startup. */
export const DEFAULT_SCREENSHOT_SHORTCUT = "F1";

export interface Settings {
  /** Global screenshot shortcut in global-hotkey string form (e.g. "F1", "Ctrl+Shift+KeyA"). */
  screenshotShortcut: string;
}

const DEFAULT_SETTINGS: Settings = {
  screenshotShortcut: DEFAULT_SCREENSHOT_SHORTCUT,
};

interface SettingsState {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
}

export function loadSettings(): Settings {
  try {
    migrateLegacyKey();
    const raw = getStorage()?.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return cloneDefaults();
    return {
      screenshotShortcut: isShortcutString(parsed.screenshotShortcut)
        ? parsed.screenshotShortcut
        : DEFAULT_SETTINGS.screenshotShortcut,
    };
  } catch {
    return cloneDefaults();
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: loadSettings(),
  updateSettings: (patch) => {
    const next = validateSettings({ ...get().settings, ...patch });
    persist(next);
    set({ settings: next });
  },
  resetSettings: () => {
    const next = cloneDefaults();
    persist(next);
    set({ settings: next });
  },
}));

function validateSettings(value: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (!isRecord(value)) return { ...d };
  return {
    screenshotShortcut: isShortcutString(value.screenshotShortcut)
      ? (value.screenshotShortcut as string)
      : d.screenshotShortcut,
  };
}

/**
 * Loose format check for a shortcut string. Real legality is enforced by the
 * Rust global-hotkey parser when registering — this only filters obviously
 * broken values before we persist/submit them.
 */
function isShortcutString(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  // Tokens separated by "+", last token is the main key (letter/digit/F-key/special).
  // Example valid: "F1", "Ctrl+Shift+KeyA", "Alt+Digit1".
  return /^[A-Za-z0-9]+(\+[A-Za-z0-9]+)*$/.test(value);
}

function persist(settings: Settings) {
  try {
    getStorage()?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to persist settings", error);
  }
}

/**
 * One-time migration from the pre-rename key (snapnote → stepmark).
 * If the legacy key exists and the new key does not, copy it over and remove the legacy key.
 */
function migrateLegacyKey(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const legacy = storage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
    if (!legacy) return;
    if (storage.getItem(SETTINGS_STORAGE_KEY) == null) {
      storage.setItem(SETTINGS_STORAGE_KEY, legacy);
    }
    storage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to migrate legacy settings key", error);
  }
}

function getStorage(): Storage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function cloneDefaults(): Settings {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as Settings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
