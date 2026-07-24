use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

/// Persisted application settings, stored as `settings.json` under the
/// platform config dir (`%APPDATA%\com.stepmark.app` on Windows).
///
/// This is the single source of truth for user preferences that must survive
/// restarts and be shared across windows. The frontend localStorage is NOT
/// used for these (Tauri webview localStorage is partitioned per window on
/// Windows, so it cannot reliably share data between the main window and the
/// shortcut-settings window).
#[derive(Default, Serialize, Deserialize)]
pub struct Settings {
    /// Global screenshot shortcut in global-hotkey string form ("F1",
    /// "Ctrl+Shift+KeyA", ...). `None` means "never set, use the default".
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub screenshot_shortcut: Option<String>,
}

impl Settings {
    fn path(app: &AppHandle) -> Result<PathBuf, String> {
        let dir = app
            .path()
            .app_config_dir()
            .map_err(|e| format!("无法定位配置目录: {e}"))?;
        fs::create_dir_all(&dir).map_err(|e| format!("创建配置目录失败: {e}"))?;
        Ok(dir.join("settings.json"))
    }

    /// Load settings from disk. Returns defaults when the file does not exist
    /// or fails to parse (never propagates a "missing file" as an error).
    pub fn load(app: &AppHandle) -> Self {
        let path = match Self::path(app) {
            Ok(p) => p,
            Err(e) => {
                eprintln!("[settings] {e}");
                return Self::default();
            }
        };
        if !path.exists() {
            return Self::default();
        }
        match fs::read(&path) {
            Ok(raw) => serde_json::from_slice(&raw).unwrap_or_else(|e| {
                eprintln!("[settings] 解析 settings.json 失败，回退默认值: {e}");
                Self::default()
            }),
            Err(e) => {
                eprintln!("[settings] 读取 settings.json 失败，回退默认值: {e}");
                Self::default()
            }
        }
    }

    /// Persist settings to disk.
    pub fn save(app: &AppHandle, settings: &Self) -> Result<(), String> {
        let path = Self::path(app)?;
        let json = serde_json::to_string_pretty(settings)
            .map_err(|e| format!("序列化 settings 失败: {e}"))?;
        fs::write(&path, json).map_err(|e| format!("写入 settings 失败: {e}"))
    }
}
