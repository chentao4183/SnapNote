import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SCREENSHOT_SHORTCUT,
  SETTINGS_STORAGE_KEY,
  loadSettings,
  useSettingsStore,
} from "./settingsStore";

const ORIGINAL_LOCAL_STORAGE = globalThis.localStorage;

function withStorage(storage: {
  getItem: (k: string) => string | null;
  setItem?: (k: string, v: string) => void;
}) {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
}

function restoreStorage() {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: ORIGINAL_LOCAL_STORAGE });
}

describe("loadSettings", () => {
  afterEach(restoreStorage);

  it("falls back to defaults when localStorage is missing the key", () => {
    withStorage({ getItem: () => null });
    expect(loadSettings()).toEqual({ screenshotShortcut: DEFAULT_SCREENSHOT_SHORTCUT });
  });

  it("loads a valid persisted shortcut", () => {
    withStorage({
      getItem: (k) =>
        k === SETTINGS_STORAGE_KEY ? JSON.stringify({ screenshotShortcut: "Ctrl+Shift+KeyA" }) : null,
    });
    expect(loadSettings()).toEqual({ screenshotShortcut: "Ctrl+Shift+KeyA" });
  });

  it("falls back to defaults on corrupt JSON", () => {
    withStorage({ getItem: (k) => (k === SETTINGS_STORAGE_KEY ? "{not json" : null) });
    expect(loadSettings()).toEqual({ screenshotShortcut: DEFAULT_SCREENSHOT_SHORTCUT });
  });

  it("falls back to defaults when the shortcut field is invalid", () => {
    withStorage({
      // empty string and value with spaces/symbols are rejected by the loose check
      getItem: (k) => (k === SETTINGS_STORAGE_KEY ? JSON.stringify({ screenshotShortcut: " " }) : null),
    });
    expect(loadSettings()).toEqual({ screenshotShortcut: DEFAULT_SCREENSHOT_SHORTCUT });
  });
});

describe("useSettingsStore updates", () => {
  let captured = "";
  beforeEach(() => {
    captured = "";
    withStorage({
      getItem: () => null,
      setItem: (_k, v) => {
        captured = v;
      },
    });
    useSettingsStore.getState().resetSettings();
  });
  afterEach(restoreStorage);

  it("persists updates to localStorage", () => {
    useSettingsStore.getState().updateSettings({ screenshotShortcut: "Alt+F2" });
    const stored = JSON.parse(captured);
    expect(stored.screenshotShortcut).toBe("Alt+F2");
    expect(useSettingsStore.getState().settings.screenshotShortcut).toBe("Alt+F2");
  });

  it("resetSettings restores the default shortcut", () => {
    useSettingsStore.getState().updateSettings({ screenshotShortcut: "Alt+F2" });
    useSettingsStore.getState().resetSettings();
    expect(useSettingsStore.getState().settings.screenshotShortcut).toBe(DEFAULT_SCREENSHOT_SHORTCUT);
  });
});
