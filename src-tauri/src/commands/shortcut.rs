use std::sync::Mutex;

use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

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
    state.0.lock().map(|s| s.clone()).ok().flatten().unwrap_or_else(|| "F1".to_string())
}

/// Validates, swaps, and registers a new screenshot shortcut.
///
/// The old shortcut is unregistered first, then the new one is registered.
/// On any failure the function returns an error and leaves the registry in
/// whatever state the last successful step produced.
#[tauri::command]
pub fn set_screenshot_shortcut(
    app: tauri::AppHandle,
    state: tauri::State<CurrentShortcut>,
    key: String,
) -> Result<(), String> {
    // Validate the string parses as a shortcut before touching the registry,
    // so a malformed value never leaves us with no shortcut registered.
    let _: Shortcut = key
        .parse()
        .map_err(|e| format!("无效的快捷键「{key}」: {e}"))?;

    // unregister_all is simplest: this app registers exactly one global shortcut.
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| format!("注销旧快捷键失败: {e}"))?;

    app.global_shortcut()
        .register(&key)
        .map_err(|e| format!("注册快捷键「{key}」失败: {e}"))?;

    if let Ok(mut guard) = state.0.lock() {
        *guard = Some(key);
    }
    Ok(())
}
