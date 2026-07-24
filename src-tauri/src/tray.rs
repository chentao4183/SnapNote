use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, Submenu},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime, Wry,
};
use tauri_plugin_autostart::ManagerExt;

/// Holds the "截图 (...)" tray menu item so other modules (shortcut commands)
/// can update its text without re-querying the (read-only) tray menu graph.
/// Menu items are Arc-backed and Clone, so cloning into state is cheap.
pub struct ScreenshotMenuItem<R: Runtime>(pub MenuItem<R>);

pub fn trigger_screenshot<R: Runtime>(app: &AppHandle<R>) {
    if let Some(_win) = app.get_webview_window("selector") {
        // Do NOT show the selector window here. The webview is already
        // running (static window), so emitting selector-start is enough to
        // kick off recapture(). Showing the window now and hiding it again
        // inside recapture() causes a visible flash before the screenshot
        // background is ready. recapture() will show the window once, after
        // it has the captured image as its background.
        let _ = app.emit_to("selector", "selector-start", ());
    }
}

/// Update the tray "截图 (...)" menu item text to reflect the active shortcut.
/// `label` is the human-readable form (e.g. "F1", "Ctrl + Shift + A").
pub fn update_screenshot_label(app: &AppHandle<Wry>, label: &str) {
    if let Some(item) = app.try_state::<ScreenshotMenuItem<Wry>>() {
        let _ = item.inner().0.set_text(format!("截图 ({label})"));
    }
}

/// Build the system-tray icon, its context menu, and event handlers.
pub fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let screenshot_item = MenuItem::with_id(app, "screenshot", "截图 (F1)", true, None::<&str>)?;
    let show_item = MenuItem::with_id(app, "show", "关于 StepMark", true, None::<&str>)?;
    // Autostart checkbox reflects the registry truth (source of truth), read once
    // at build time. Toggling re-reads + writes the registry and re-syncs the box.
    let autostart_enabled = app.autolaunch().is_enabled().unwrap_or(false);
    let autostart_item =
        CheckMenuItem::with_id(app, "autostart", "开机自启", true, autostart_enabled, None::<&str>)?;
    let shortcut_item = MenuItem::with_id(app, "shortcut-settings", "快捷键", true, None::<&str>)?;
    let settings_item = Submenu::with_items(app, "设置", true, &[&autostart_item, &shortcut_item])?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&screenshot_item, &settings_item, &show_item, &quit_item])?;

    // Clone the autostart item into the menu-event closure so it can flip its
    // checkmark directly. Tauri menu items are Send + Sync + Clone.
    let autostart_for_event = autostart_item.clone();
    let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "screenshot" => {
                trigger_screenshot(app);
            }
            "show" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "autostart" => {
                // Registry is the source of truth: read current state, flip it,
                // write back, sync the checkmark, then notify the main window so
                // its React UI stays in sync if it's open.
                let next = !autostart_for_event.is_checked().unwrap_or(false);
                let write = if next {
                    app.autolaunch().enable()
                } else {
                    app.autolaunch().disable()
                };
                if write.is_ok() {
                    let _ = autostart_for_event.set_checked(next);
                    let _ = app.emit_to("main", "autostart-changed", next);
                }
            }
            "shortcut-settings" => {
                if let Some(win) = app.get_webview_window("shortcut-settings") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                trigger_screenshot(tray.app_handle());
            }
        })
        .build(app)?;

    // Expose the screenshot menu item so shortcut commands can keep its text
    // in sync with the active hotkey.
    app.manage(ScreenshotMenuItem(screenshot_item));

    Ok(())
}
