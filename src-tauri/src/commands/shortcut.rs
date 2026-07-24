use std::sync::Mutex;

use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

/// Default shortcut registered at startup, mirrored here as the fallback.
const DEFAULT_SHORTCUT: &str = "F1";

/// Tracks the screenshot shortcut string currently registered by this app.
///
/// `None` means "the startup default F1 is still registered" (we never wrote
/// a custom one). The source of truth for what the *user* picked is the
/// frontend localStorage (settingsStore); this state only mirrors whatever
/// Rust has actually registered, so the tray label and re-registration stay
/// consistent.
#[derive(Default)]
pub struct CurrentShortcut(pub Mutex<Option<String>>);

/// Returns the currently registered screenshot shortcut, or the default "F1"
/// when no custom shortcut has been set.
#[tauri::command]
pub fn get_screenshot_shortcut(state: tauri::State<CurrentShortcut>) -> String {
    state.0.lock().map(|s| s.clone()).ok().flatten().unwrap_or_else(|| DEFAULT_SHORTCUT.to_string())
}

/// First-time registration of the screenshot shortcut, called by the main
/// window once it loads. `key` is the user's persisted shortcut (defaults to
/// "F1" on the frontend). Nothing is unregistered because at this point Rust
/// has registered nothing yet — the whole point of routing startup registration
/// through here is that every registration uses the same string-based path.
#[tauri::command]
pub fn init_screenshot_shortcut(
    app: tauri::AppHandle,
    state: tauri::State<CurrentShortcut>,
    key: String,
) -> Result<(), String> {
    let _: Shortcut = key.parse().map_err(|e| format!("无效的快捷键「{key}」: {e}"))?;
    app.global_shortcut()
        .register(key.as_str())
        .map_err(|e| format!("注册快捷键「{key}」失败: {e}"))?;
    if let Ok(mut guard) = state.0.lock() {
        *guard = Some(key);
    }
    Ok(())
}

/// Validates, swaps, and registers a new screenshot shortcut.
///
/// The previously registered shortcut is unregistered explicitly (not via
/// unregister_all) so the exact old key is removed even if some other code
/// path registered something extra. On any failure the function returns an
/// error and leaves the registry in whatever state the last successful step
/// produced.
#[tauri::command]
pub fn set_screenshot_shortcut(
    app: tauri::AppHandle,
    state: tauri::State<CurrentShortcut>,
    key: String,
) -> Result<(), String> {
    // Validate the string parses as a shortcut before touching the registry,
    // so a malformed value never leaves us with no shortcut registered.
    let _: Shortcut = key.parse().map_err(|e| format!("无效的快捷键「{key}」: {e}"))?;

    // The key currently registered. Defaults to F1 (the startup registration)
    // when we have no record of a custom one.
    let prev = state
        .0
        .lock()
        .ok()
        .and_then(|s| s.clone())
        .unwrap_or_else(|| DEFAULT_SHORTCUT.to_string());

    // Only swap if it actually changed.
    if prev != key {
        // Explicitly unregister the exact previous shortcut. Using
        // unregister_all would also work, but unregister(prev) keeps the
        // intent precise and tolerates any stray registrations.
        app.global_shortcut()
            .unregister(prev.as_str())
            .map_err(|e| format!("注销旧快捷键「{prev}」失败: {e}"))?;

        app.global_shortcut()
            .register(key.as_str())
            .map_err(|e| format!("注册快捷键「{key}」失败: {e}"))?;

        if let Ok(mut guard) = state.0.lock() {
            *guard = Some(key);
        }
    }
    Ok(())
}
