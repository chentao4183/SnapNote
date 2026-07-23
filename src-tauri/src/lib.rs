mod commands;
mod migrate;
mod tray;

use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::{
    Builder as ShortcutBuilder, Code, GlobalShortcutExt, Shortcut, ShortcutState,
};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shortcut = Shortcut::new(None, Code::F1);
    let global_shortcut = ShortcutBuilder::new()
        .with_handler(|app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                tray::trigger_screenshot(app);
            }
        })
        .build();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(global_shortcut)
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--autostarted"]),
        ))
        .setup(move |app| {
            // Register the F1 hotkey (no modifiers) as the out-of-the-box default.
            // If the user has a custom shortcut persisted in localStorage, the main
            // window's frontend will invoke set_screenshot_shortcut after it loads
            // to swap F1 out.
            app.global_shortcut()
                .register(shortcut)
                .expect("failed to register F1 shortcut");
            tray::setup_tray(app.handle())?;
            // One-time cleanup: remove the stale autostart entry from the pre-rename build.
            migrate::cleanup_legacy_autostart();
            Ok(())
        })
        .manage(commands::shortcut::CurrentShortcut::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::screenshot::capture_screen,
            commands::clipboard::copy_image_to_clipboard,
            commands::save::save_image,
            commands::autostart::get_autostart,
            commands::autostart::set_autostart,
            commands::shortcut::get_screenshot_shortcut,
            commands::shortcut::set_screenshot_shortcut,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
