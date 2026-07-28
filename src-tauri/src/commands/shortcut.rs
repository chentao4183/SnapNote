use std::{thread, time::Duration};

use tauri::Emitter;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

use crate::settings::Settings;
use crate::tray;

/// Default shortcut when the user has never customized it.
const DEFAULT_SHORTCUT: &str = "F1";

/// Human-readable label for a stored shortcut string (mirrors the frontend
/// shortcutLabel): "Ctrl+Shift+KeyA" -> "Ctrl + Shift + A".
fn label_for(shortcut: &str) -> String {
    shortcut
        .split('+')
        .map(|tok| match tok {
            "Ctrl" => "Ctrl",
            "Shift" => "Shift",
            "Alt" => "Alt",
            "Super" => "Win",
            other => {
                if let Some(rest) = other.strip_prefix("Key") {
                    rest
                } else if let Some(rest) = other.strip_prefix("Digit") {
                    rest
                } else {
                    other
                }
            }
        })
        .collect::<Vec<_>>()
        .join(" + ")
}

/// Returns the persisted screenshot shortcut, or the default "F1" when unset.
/// Reads from the Rust-side settings.json (the source of truth), NOT from any
/// frontend localStorage — those are per-window and do not reliably share.
#[tauri::command]
pub fn get_screenshot_shortcut(app: tauri::AppHandle) -> String {
    Settings::load(&app)
        .screenshot_shortcut
        .unwrap_or_else(|| DEFAULT_SHORTCUT.to_string())
}

/// Ensure the persisted screenshot shortcut is registered by this process.
///
/// Every registration path passes the same string representation to the
/// plugin, preserving the identity used by later unregister operations.
fn ensure_screenshot_shortcut(app: &tauri::AppHandle) -> Result<String, String> {
    let key = Settings::load(&app)
        .screenshot_shortcut
        .unwrap_or_else(|| DEFAULT_SHORTCUT.to_string());
    let _: Shortcut = key
        .parse()
        .map_err(|e| format!("无效的快捷键「{key}」: {e}"))?;
    if !app.global_shortcut().is_registered(key.as_str()) {
        app.global_shortcut()
            .register(key.as_str())
            .map_err(|e| format!("注册快捷键「{key}」失败: {e}"))?;
    }
    tray::update_screenshot_label(&app, &label_for(&key));
    Ok(key)
}

/// Register during Rust startup instead of relying on a hidden WebView's
/// React effect. Retry briefly if a just-exiting process still owns the key.
pub fn register_screenshot_shortcut_on_startup(app: tauri::AppHandle) {
    if ensure_screenshot_shortcut(&app).is_ok() {
        return;
    }

    thread::spawn(move || {
        for _ in 0..10 {
            thread::sleep(Duration::from_secs(1));
            if ensure_screenshot_shortcut(&app).is_ok() {
                return;
            }
        }
        eprintln!("[shortcut] failed to register screenshot shortcut after retries");
    });
}

/// Validates, swaps, registers, and persists a new screenshot shortcut.
///
/// The previously registered shortcut is unregistered explicitly (not via
/// unregister_all) so the exact old key is removed even if some other code
/// path registered something extra. The new key is persisted to settings.json
/// so it survives restarts and is shared across windows.
#[tauri::command]
pub fn set_screenshot_shortcut(app: tauri::AppHandle, key: String) -> Result<(), String> {
    // Validate the string parses as a shortcut before touching the registry,
    // so a malformed value never leaves us with no shortcut registered.
    let _: Shortcut = key
        .parse()
        .map_err(|e| format!("无效的快捷键「{key}」: {e}"))?;

    // The key currently persisted/registered. Defaults to F1.
    let prev = Settings::load(&app)
        .screenshot_shortcut
        .unwrap_or_else(|| DEFAULT_SHORTCUT.to_string());

    if prev == key {
        ensure_screenshot_shortcut(&app)?;
        return Ok(());
    }

    // Unregister the exact previous shortcut, then register the new one.
    if app.global_shortcut().is_registered(prev.as_str()) {
        app.global_shortcut()
            .unregister(prev.as_str())
            .map_err(|e| format!("注销旧快捷键「{prev}」失败: {e}"))?;
    }

    if let Err(e) = app.global_shortcut().register(key.as_str()) {
        let _ = app.global_shortcut().register(prev.as_str());
        return Err(format!("注册快捷键「{key}」失败: {e}"));
    }

    // Persist the new key to disk (single source of truth).
    let mut settings = Settings::load(&app);
    settings.screenshot_shortcut = Some(key.clone());
    Settings::save(&app, &settings)?;

    tray::update_screenshot_label(&app, &label_for(&key));

    // Notify other windows (e.g. main) so they can refresh their mirror.
    let _ = app.emit("shortcut-changed", key.as_str());
    Ok(())
}
