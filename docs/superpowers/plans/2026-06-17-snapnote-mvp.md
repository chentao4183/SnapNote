# SnapNote MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows screenshot annotation tool (Snipaste-style) whose differentiator is a one-step "smart annotation" that combines rect + arrow + label in a single drag-point-type flow.

**Architecture:** Tauri 2 desktop app. Rust backend handles screen capture (xcap), global hotkey, system tray, clipboard. React frontend runs a multi-window UI: a hidden main window, a fullscreen screenshot-selector window, and a fullscreen editor window. The editor uses Konva.js for canvas rendering and Zustand for state. Annotations are plain data records in a single array; selection/edit/undo all operate on that array.

**Tech Stack:** Tauri 2.x · Rust 1.95 · React 18 · TypeScript · Vite · Konva.js (react-konva) · Zustand · xcap crate · tauri-plugin-global-shortcut · tauri-plugin-clipboard-manager · tauri-plugin-dialog

**Spec:** `docs/superpowers/specs/2026-06-17-snapnote-design.md`

---

## File Structure

```
SnapNote/
├── docs/superpowers/{specs,plans}/            ← docs (already exist)
├── package.json                               ← npm manifest
├── vite.config.ts                             ← multi-page build (main/selector/editor)
├── tsconfig.json
├── index.html                                 ← main window entry
├── selector.html                              ← screenshot selector window entry
├── editor.html                                ← editor window entry
├── src/
│   ├── main.tsx                               ← main window React root
│   ├── selector.tsx                           ← selector window React root
│   ├── editor.tsx                             ← editor window React root
│   ├── windows/
│   │   ├── MainWindow.tsx                     ← tray-triggered, settings placeholder
│   │   ├── SelectorWindow.tsx                 ← fullscreen select-region overlay
│   │   └── EditorWindow.tsx                   ← fullscreen editor shell (canvas + toolbar)
│   ├── ipc/
│   │   └── bridge.ts                          ← typed wrappers around invoke()/listen()
│   ├── store/
│   │   └── editorStore.ts                     ← Zustand store: annotations, selection, history
│   ├── types/
│   │   └── annotation.ts                      ← Annotation, EditorState, ToolType types
│   ├── canvas/
│   │   ├── EditorStage.tsx                    ← Konva Stage wrapper
│   │   ├── layers/
│   │   │   ├── BackgroundLayer.tsx
│   │   │   └── AnnotationLayer.tsx
│   │   └── shapes/
│   │       ├── RectShape.tsx
│   │       ├── ArrowShape.tsx
│   │       ├── TextLabelShape.tsx             ← the red-bg label (smart/text tools)
│   │       ├── MosaicShape.tsx
│   │       └── SmartAnnotationGroup.tsx       ← rect+arrow+label composite for 'smart'
│   ├── tools/
│   │   ├── toolTypes.ts                       ← ToolType enum + dispatcher hook
│   │   ├── useSmartAnnotationTool.ts          ← 5-step state machine (§5 of spec)
│   │   ├── useRectTool.ts
│   │   ├── useArrowTool.ts
│   │   ├── useTextTool.ts
│   │   └── useMosaicTool.ts
│   ├── geometry/
│   │   └── corners.ts                         ← "nearest corner" algorithm (§5.2 of spec)
│   ├── components/
│   │   ├── Toolbar.tsx
│   │   ├── TextInputOverlay.tsx               ← HTML input positioned over canvas
│   │   └── FirstRunCard.tsx                   ← autostart prompt
│   └── export/
│       └── exportImage.ts                     ← stage.toCanvas() → png/jpg/clipboard
├── src-tauri/
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json                        ← window defs, tray, plugins
│   ├── icons/
│   └── src/
│       ├── main.rs                            ← tauri::Builder, plugin registration
│       ├── lib.rs
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── screenshot.rs                  ← xcap capture → base64
│       │   ├── clipboard.rs                   ← write image to clipboard
│       │   └── save.rs                        ← write image file
│       ├── autostart.rs                       ← registry-based autostart (Win32)
│       └── tray.rs                            ← tray icon + menu + handlers
```

**Decomposition rationale:**
- `geometry/`, `types/`, `ipc/` are pure-logic modules with no React — easy to unit test, no canvas needed.
- Each tool is a `use*Tool.ts` hook returning mouse handlers; the editor mounts whichever is active. Tools never touch the canvas directly — they only produce Annotation data via the store. This makes them testable with mocked stores.
- Each shape is a `react-konva` component; the `AnnotationLayer` dispatches by `annotation.type`. Shapes are pure renderers of an Annotation; no mutation logic.
- Rust commands are one file per capability (screenshot/clipboard/save), each independently testable.

---

## Task 1: Scaffold the Tauri + React + Vite + TS project

**Goal:** Empty but runnable Tauri app with a React frontend, git-initialized, first commit made.

**Files:**
- Create: entire project skeleton via `npm create tauri-app`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd D:\SnapNote
git init
git config core.autocrlf true
```

- [ ] **Step 2: Scaffold the Tauri app (non-interactive)**

We can't use `npm create tauri-app` interactively. Use the CLI flags:

```bash
cd D:\SnapNote
npm create tauri-app@latest . -- --template react-ts --manager npm --name SnapNote --identifier com.snapnote.app
```

If the interactive prompt still blocks, fall back to creating in a temp dir and moving files:

```bash
cd D:\SnapNote
npm create tauri-app@latest snapnote-tmp -- --template react-ts --manager npm --name SnapNote --identifier com.snapnote.app
# then move all files from snapnote-tmp up one level, delete snapnote-tmp
```

Expected: project now has `package.json`, `src/`, `src-tauri/`, `index.html`, `vite.config.ts`, `tsconfig.json`.

- [ ] **Step 3: Verify it builds and runs**

```bash
npm install
npm run tauri dev
```

Expected: A Tauri window opens showing the default React welcome page. Close it with Ctrl+C.

- [ ] **Step 4: Write `.gitignore`**

Create `D:\SnapNote\.gitignore`:

```gitignore
# Dependencies
node_modules/

# Build output
dist/
src-tauri/target/

# Tauri
src-tauri/WixTools/
src-tauri/.cargo/

# OS / IDE
.DS_Store
Thumbs.db
.vscode/
.idea/

# Brainstorm scratch (superpowers visual companion)
.superpowers/

# Logs
*.log
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: scaffold Tauri + React + TS project"
```

---

## Task 2: Install & configure dependencies

**Goal:** All runtime deps present; multi-page Vite config (main/selector/editor HTML entries) wired so three windows can be built.

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `vite.config.ts`
- Create: `selector.html`, `editor.html`
- Create: `src/selector.tsx`, `src/editor.tsx`

- [ ] **Step 1: Install frontend deps**

```bash
npm install konva react-konva zustand
npm install -D @types/konva
```

- [ ] **Step 2: Configure multi-page Vite build**

Replace `vite.config.ts` with:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        selector: "selector.html",
        editor: "editor.html",
      },
    },
  },
});
```

- [ ] **Step 3: Create selector and editor HTML entries**

Create `D:\SnapNote\selector.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SnapNote Selector</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/selector.tsx"></script>
  </body>
</html>
```

Create `D:\SnapNote\editor.html` (identical except title and script):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SnapNote Editor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/editor.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create selector/editor React roots (placeholder)**

Create `D:\SnapNote\src\selector.tsx`:

```typescript
import React from "react";
import { createRoot } from "react-dom/client";

function SelectorApp() {
  return <div style={{ width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)" }}>Selector</div>;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SelectorApp />
  </React.StrictMode>
);
```

Create `D:\SnapNote\src\editor.tsx`:

```typescript
import React from "react";
import { createRoot } from "react-dom/client";

function EditorApp() {
  return <div style={{ width: "100vw", height: "100vh", background: "#1a1a2e" }}>Editor</div>;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <EditorApp />
  </React.StrictMode>
);
```

Also add global CSS to remove body margins in all three windows. Create `D:\SnapNote\src\global.css`:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #root { width: 100%; height: 100%; overflow: hidden; }
body { font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif; }
```

Import it in `src/selector.tsx`, `src/editor.tsx`, and the existing `src/main.tsx` (add `import "./global.css";` at the top of each).

- [ ] **Step 5: Verify dev server still runs**

```bash
npm run tauri dev
```

Expected: app still launches (only main window for now). Close it.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: install deps + multi-page Vite config"
```

---

## Task 3: Rust screenshot command (xcap)

**Goal:** A `capture_screen` Tauri command that returns the full primary monitor as a PNG base64 string.

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/screenshot.rs`
- Modify: `src-tauri/src/lib.rs` (or `main.rs` — whichever `tauri::Builder` lives in)

- [ ] **Step 1: Add xcap and base64 deps**

In `src-tauri/Cargo.toml`, add under `[dependencies]`:

```toml
xcap = "0.0.14"
base64 = "0.22"
```

(If `xcap 0.0.14` doesn't resolve at build time, run `cargo search xcap` and pin the latest 0.0.x. The API used below is stable across 0.0.x.)

- [ ] **Step 2: Write the screenshot command**

Create `D:\SnapNote\src-tauri\src\commands\mod.rs`:

```rust
pub mod screenshot;
pub mod clipboard;
pub mod save;
```

Create `D:\SnapNote\src-tauri\src\commands\screenshot.rs`:

```rust
use base64::Engine;
use xcap::Monitor;

#[tauri::command]
pub fn capture_screen() -> Result<String, String> {
    // Capture the primary monitor only.
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let primary = monitors
        .into_iter()
        .find(|m| m.is_primary().unwrap_or(false))
        .or_else(|| Monitor::all().ok()?.into_iter().next())
        .ok_or_else(|| "no monitor found".to_string())?;

    let mut image = primary
        .capture_image()
        .map_err(|e| e.to_string())?;

    // Encode as PNG → base64 data URL.
    let mut buf = std::io::Cursor::new(Vec::new());
    image
        .write_to(&mut buf, image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(buf.into_inner());
    Ok(format!("data:image/png;base64,{}", b64))
}
```

Add the `image` crate if not already present (xcap re-exports its image type but we need the writer trait). In `Cargo.toml`:

```toml
image = { version = "0.25", default-features = false, features = ["png"] }
```

(Add `image` to the dependencies block above.)

- [ ] **Step 3: Register the command in the Tauri builder**

In `src-tauri/src/lib.rs` (the file containing `tauri::Builder`), add at top:

```rust
mod commands;
```

And modify the builder to invoke_handler:

```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        commands::screenshot::capture_screen,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
```

- [ ] **Step 4: Build to verify it compiles**

```bash
npm run tauri build -- --debug
```

Expected: builds successfully (may take a few minutes the first time). If xcap version doesn't resolve, adjust the version pin in Step 1.

- [ ] **Step 5: Smoke-test the command from devtools**

```bash
npm run tauri dev
```

Open devtools (F12 in the dev window) and run:

```javascript
await window.__TAURI__.core.invoke('capture_screen')
```

Expected: returns a long string starting with `data:image/png;base64,`. (Note: on Windows, screen capture may require the window to NOT be in foreground; if you get an error, hide the devtools window first.)

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add capture_screen command using xcap"
```

---

## Task 4: Global hotkey (F1) + system tray

**Goal:** Pressing F1 anywhere triggers a `screenshot-triggered` event to the frontend. A tray icon with a context menu exists; left-click also triggers screenshot.

**Files:**
- Modify: `src-tauri/Cargo.toml` (add plugins)
- Create: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add the plugins**

```bash
cd src-tauri
cargo add tauri-plugin-global-shortcut
cargo add tauri-plugin-clipboard-manager
cargo add tauri-plugin-dialog
cd ..
```

- [ ] **Step 2: Write the tray module**

Create `D:\SnapNote\src-tauri\src\tray.rs`:

```rust
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, Runtime,
};

pub fn setup_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let screenshot_item = MenuItem::with_id(app, "screenshot", "Screenshot (F1)", true, None::<&str>)?;
    let show_item = MenuItem::with_id(app, "show", "Show main window", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&screenshot_item, &show_item, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "screenshot" => {
                let _ = app.emit("screenshot-triggered", ());
            }
            "show" => {
                if let Some(win) = app.get_webview_window("main") {
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
            if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                let _ = tray.app_handle().emit("screenshot-triggered", ());
            }
        })
        .build(app)?;

    Ok(())
}
```

- [ ] **Step 3: Register tray + global shortcut in the builder**

In `src-tauri/src/lib.rs`, replace the builder with:

```rust
mod commands;
mod tray;

use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState, GlobalShortcutExt};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_shortcut(Shortcut::new(Some(Modifiers::empty()), Code::F1))
            .unwrap()
            .with_handler(|app, shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    let _ = app.emit("screenshot-triggered", ());
                }
            })
            .build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            tray::setup_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::screenshot::capture_screen,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

> Note: `tauri-plugin-global-shortcut` v2 API: build a `Builder`, chain `.with_shortcut(...)` and `.with_handler(...)`, then `.build()` returns the plugin instance. If the chained API differs in your installed version, check `cargo doc --open -p tauri-plugin-global-shortcut` and adapt — the contract is: register F1 with no modifiers, fire `screenshot-triggered` event on Pressed.

- [ ] **Step 4: Hide the main window on startup**

In `src-tauri/tauri.conf.json`, find the main window config and set `"visible": false`. The main window should be created but hidden; we'll show it from the tray menu.

- [ ] **Step 5: Build & smoke test**

```bash
npm run tauri dev
```

Expected:
- No window shows (main is hidden).
- Tray icon appears in the system tray.
- Right-click tray → menu with "Screenshot (F1)", "Show main window", "Quit".
- Pressing F1 anywhere → check devtools console of main window (need to briefly show it) for the `screenshot-triggered` event. (For now just confirm no panic; the selector window is wired in Task 6.)

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: global F1 hotkey + system tray"
```

---

## Task 5: Clipboard + save commands (Rust)

**Goal:** `copy_image_to_clipboard(base64)` and `save_image(base64, path, format)` commands.

**Files:**
- Create: `src-tauri/src/commands/clipboard.rs`
- Create: `src-tauri/src/commands/save.rs`
- Modify: `src-tauri/src/lib.rs` (register commands)
- Modify: `src-tauri/Cargo.toml` (image is already added in Task 3)

- [ ] **Step 1: Clipboard command**

Create `D:\SnapNote\src-tauri\src\commands\clipboard.rs`:

```rust
use base64::Engine;
use tauri_plugin_clipboard_manager::ClipboardExt;

#[tauri::command]
pub fn copy_image_to_clipboard(app: tauri::AppHandle, data_url: String) -> Result<(), String> {
    let b64 = data_url
        .strip_prefix("data:image/png;base64,")
        .ok_or_else(|| "expected png data url".to_string())?;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(b64)
        .map_err(|e| e.to_string())?;
    app.clipboard()
        .write_image(&bytes)
        .map_err(|e| e.to_string())
}
```

> Note: `tauri-plugin-clipboard-manager` v2 `write_image` accepts raw PNG bytes and converts to a platform bitmap. Verify the exact method signature with `cargo doc`; some versions take `&[u8]` directly, others take a `Image` wrapper. Adapt accordingly.

- [ ] **Step 2: Save command**

Create `D:\SnapNote\src-tauri\src\commands\save.rs`:

```rust
use base64::Engine;
use std::io::BufWriter;
use std::path::Path;

#[tauri::command]
pub fn save_image(data_url: String, path: String, format: String) -> Result<(), String> {
    let b64 = data_url
        .strip_prefix("data:image/png;base64,")
        .ok_or_else(|| "expected png data url".to_string())?;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(b64)
        .map_err(|e| e.to_string())?;

    let img = image::load_from_memory_with_format(&bytes, image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    let file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
    let mut writer = BufWriter::new(file);

    match format.as_str() {
        "png" => img.write_to(&mut writer, image::ImageFormat::Png),
        "jpg" | "jpeg" => img.write_to(&mut writer, image::ImageFormat::Jpeg),
        other => return Err(format!("unsupported format: {}", other)),
    }
    .map_err(|e| e.to_string())?;

    // If saved as jpg, the original png-derived RGBA must be converted to RGB.
    // image crate handles this automatically on write_to with Jpeg format.
    let _ = Path::new(&path); // path validated by File::create above
    Ok(())
}
```

- [ ] **Step 3: Register both commands**

In `src-tauri/src/lib.rs`, extend `invoke_handler`:

```rust
.invoke_handler(tauri::generate_handler![
    commands::screenshot::capture_screen,
    commands::clipboard::copy_image_to_clipboard,
    commands::save::save_image,
])
```

- [ ] **Step 4: Build & smoke test**

```bash
npm run tauri dev
```

In devtools of the main window (show it via tray → "Show main window"):

```javascript
const { invoke } = window.__TAURI__.core;
// generate a 1x1 red png data url
const url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
await invoke('copy_image_to_clipboard', { dataUrl: url });
// paste into MS Paint to verify a 1x1 red pixel appears
```

Expected: no error; pasting into Paint shows a red pixel.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: clipboard + save image commands"
```

---

## Task 6: Multi-window setup + IPC bridge + types

**Goal:** Selector and editor windows are declared in `tauri.conf.json`. A typed `ipc/bridge.ts` wraps `invoke`/`listen`. Core types defined.

**Files:**
- Modify: `src-tauri/tauri.conf.json` (add 2 windows)
- Create: `src/ipc/bridge.ts`
- Create: `src/types/annotation.ts`

- [ ] **Step 1: Declare selector & editor windows in tauri.conf.json**

In `src-tauri/tauri.conf.json`, under `"app" > "windows"`, add two entries (main already exists with `visible: false`):

```json
{
  "label": "selector",
  "title": "SnapNote",
  "url": "selector.html",
  "width": 1920,
  "height": 1080,
  "decorations": false,
  "fullscreen": true,
  "alwaysOnTop": true,
  "resizable": false,
  "visible": false,
  "transparent": true,
  "skipTaskbar": true
},
{
  "label": "editor",
  "title": "SnapNote Editor",
  "url": "editor.html",
  "width": 1920,
  "height": 1080,
  "decorations": false,
  "fullscreen": true,
  "alwaysOnTop": false,
  "resizable": false,
  "visible": false,
  "skipTaskbar": true
}
```

- [ ] **Step 2: Write the core types**

Create `D:\SnapNote\src\types\annotation.ts`:

```typescript
export type ToolType = "smart" | "rect" | "arrow" | "text" | "mosaic";

export type Corner = "tl" | "tr" | "bl" | "br";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationStyle {
  borderColor: string;
  borderWidth: number;
  bgColor: string;
  textColor: string;
  fontSize: number;
}

export const DEFAULT_STYLE: AnnotationStyle = {
  borderColor: "#ff4757",
  borderWidth: 3,
  bgColor: "#ff4757",
  textColor: "#ffffff",
  fontSize: 13,
};

export interface ArrowData {
  // For 'smart': which corner of the rect the arrow starts from.
  startCorner?: Corner;
  // For 'arrow' tool: absolute start coords (rect-independent).
  startX?: number;
  startY?: number;
  endX: number;
  endY: number;
}

export interface Annotation {
  id: string;
  type: ToolType;
  rect?: Rect;
  note?: string;
  arrow?: ArrowData;
  style: AnnotationStyle;
}

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

- [ ] **Step 3: Write the IPC bridge**

Create `D:\SnapNote\src\ipc\bridge.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

// ---- Commands ----

export async function captureScreen(): Promise<string> {
  return invoke<string>("capture_screen");
}

export async function copyImageToClipboard(dataUrl: string): Promise<void> {
  await invoke("copy_image_to_clipboard", { dataUrl });
}

export async function saveImage(dataUrl: string, path: string, format: "png" | "jpg"): Promise<void> {
  await invoke("save_image", { dataUrl, path, format });
}

// ---- Events ----

export function onScreenshotTriggered(cb: () => void): Promise<UnlistenFn> {
  return listen("screenshot-triggered", () => cb());
}

// ---- Window controls ----

export async function showSelectorWindow(): Promise<void> {
  const win = getCurrentWebviewWindow();
  // The selector window handles its own logic; main window just shows it.
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const selector = await WebviewWindow.getByLabel("selector");
  if (selector) {
    await selector.show();
    await selector.setFocus();
  }
}

export async function hideCurrentWindow(): Promise<void> {
  await getCurrentWebviewWindow().hide();
}

export async function closeCurrentWindow(): Promise<void> {
  await getCurrentWebviewWindow().close();
}

export async function showEditorWindow(selectionData: { x: number; y: number; width: number; height: number; fullBase64: string }): Promise<void> {
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const editor = await WebviewWindow.getByLabel("editor");
  if (editor) {
    await editor.emit("editor-load", selectionData);
    await editor.show();
    await editor.setFocus();
  }
}
```

- [ ] **Step 4: Build to verify types compile**

```bash
npm run build
```

Expected: TypeScript compiles cleanly. (Frontend build only; no Rust compile here.)

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: multi-window config + IPC bridge + core types"
```

---

## Task 7: Screenshot selector window

**Goal:** Fullscreen overlay. On mount, captures the screen, displays it, lets user drag a rectangle, and on mouse-up emits the selection + base64 to the editor window and hides itself.

**Files:**
- Create: `src/windows/SelectorWindow.tsx`
- Modify: `src/selector.tsx` (wire the component)

- [ ] **Step 1: Write the SelectorWindow component**

Create `D:\SnapNote\src\windows\SelectorWindow.tsx`:

```typescript
import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect } from "react-konva";
import type Konva from "konva";
import { captureScreen, hideCurrentWindow, showEditorWindow } from "../ipc/bridge";
import type { Selection } from "../types/annotation";

export default function SelectorWindow() {
  const [bg, setBg] = useState<string>("");
  const [size, setSize] = useState({ width: window.screen.width, height: window.screen.height });
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const dataUrl = await captureScreen();
      if (mounted) setBg(dataUrl);
    })();
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => {
      mounted = false;
      window.removeEventListener("resize", onResize);
    };
  }, []);

  function onMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const pos = e.target.getStage()!.getPointerPosition()!;
    startRef.current = pos;
    setSelection({ x: pos.x, y: pos.y, width: 0, height: 0 });
  }

  function onMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!startRef.current) return;
    const pos = e.target.getStage()!.getPointerPosition()!;
    const s = startRef.current;
    setSelection({
      x: Math.min(s.x, pos.x),
      y: Math.min(s.y, pos.y),
      width: Math.abs(pos.x - s.x),
      height: Math.abs(pos.y - s.y),
    });
  }

  async function onMouseUp() {
    if (!selection || selection.width < 5 || selection.height < 5) {
      // Treat as a click-to-cancel
      await hideCurrentWindow();
      return;
    }
    await showEditorWindow({
      x: selection.x,
      y: selection.y,
      width: selection.width,
      height: selection.height,
      fullBase64: bg,
    });
    await hideCurrentWindow();
    // Reset for next time
    setSelection(null);
    startRef.current = null;
    setBg("");
  }

  return (
    <Stage width={size.width} height={size.height} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <Layer>
        {bg && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <any_image src={bg} x={0} y={0} width={size.width} height={size.height} />
        )}
        {/* Dim overlay */}
        <Rect x={0} y={0} width={size.width} height={size.height} fill="rgba(0,0,0,0.3)" listening={false} />
        {/* Punch a hole for the selection */}
        {selection && (
          <Rect
            x={selection.x}
            y={selection.y}
            width={selection.width}
            height={selection.height}
            fill="rgba(0,0,0,0)"
            stroke="#ff4757"
            strokeWidth={2}
            dash={[6, 3]}
            listening={false}
          />
        )}
      </Layer>
    </Stage>
  );
}

// Konva image needs a class wrapper; using a small helper component.
import { Image as KonvaImage } from "react-konva";
function any_image(props: { src: string; x: number; y: number; width: number; height: number }) {
  return <KonvaImageImage {...props} />;
}
import { useRef as _useRef } from "react";
import useImage from "use-image";

function KonvaImageImage({ src, x, y, width, height }: { src: string; x: number; y: number; width: number; height: number }) {
  const [image] = useImage(src);
  return <KonvaImage image={image} x={x} y={y} width={width} height={height} />;
}
```

> Note: the above `any_image`/`KonvaImageImage` indirection is awkward — replace by importing `use-image` directly. **Install it first:**

```bash
npm install use-image
```

Then **replace the entire SelectorWindow.tsx** with this clean version:

```typescript
import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import useImage from "use-image";
import { captureScreen, hideCurrentWindow, showEditorWindow } from "../ipc/bridge";
import type { Selection } from "../types/annotation";

export default function SelectorWindow() {
  const [bg, setBg] = useState<string>("");
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [image] = useImage(bg);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const dataUrl = await captureScreen();
      if (mounted) setBg(dataUrl);
    })();
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => {
      mounted = false;
      window.removeEventListener("resize", onResize);
    };
  }, []);

  function onMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const pos = e.target.getStage()!.getPointerPosition()!;
    startRef.current = pos;
    setSelection({ x: pos.x, y: pos.y, width: 0, height: 0 });
  }

  function onMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!startRef.current) return;
    const pos = e.target.getStage()!.getPointerPosition()!;
    const s = startRef.current;
    setSelection({
      x: Math.min(s.x, pos.x),
      y: Math.min(s.y, pos.y),
      width: Math.abs(pos.x - s.x),
      height: Math.abs(pos.y - s.y),
    });
  }

  async function onMouseUp() {
    if (!selection || selection.width < 5 || selection.height < 5) {
      await hideCurrentWindow();
      return;
    }
    await showEditorWindow({
      x: selection.x,
      y: selection.y,
      width: selection.width,
      height: selection.height,
      fullBase64: bg,
    });
    await hideCurrentWindow();
    setSelection(null);
    startRef.current = null;
    setBg("");
  }

  return (
    <Stage width={size.width} height={size.height} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <Layer>
        <KonvaImage image={image} x={0} y={0} width={size.width} height={size.height} listening={false} />
        <Rect x={0} y={0} width={size.width} height={size.height} fill="rgba(0,0,0,0.3)" listening={false} />
        {selection && (
          <Rect
            x={selection.x}
            y={selection.y}
            width={selection.width}
            height={selection.height}
            fill="rgba(0,0,0,0)"
            stroke="#ff4757"
            strokeWidth={2}
            dash={[6, 3]}
            listening={false}
          />
        )}
      </Layer>
    </Stage>
  );
}
```

- [ ] **Step 2: Wire SelectorWindow into selector.tsx**

Replace `D:\SnapNote\src\selector.tsx` with:

```typescript
import React from "react";
import { createRoot } from "react-dom/client";
import "./global.css";
import SelectorWindow from "./windows/SelectorWindow";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SelectorWindow />
  </React.StrictMode>
);
```

- [ ] **Step 3: Wire the F1 → selector window trigger**

In `D:\SnapNote\src\main.tsx`, replace its body to:

```typescript
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./global.css";
import { onScreenshotTriggered, showSelectorWindow } from "./ipc/bridge";

function MainApp() {
  useEffect(() => {
    const unlisten = onScreenshotTriggered(() => {
      showSelectorWindow();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
  return <div style={{ padding: 24, fontFamily: "system-ui" }}>SnapNote is running in the background. Press F1 to capture.</div>;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);
```

- [ ] **Step 4: Smoke test the full flow**

```bash
npm run tauri dev
```

Expected:
- Main window hidden. Tray visible.
- Press F1 → selector window appears fullscreen with dimmed screenshot behind.
- Drag a rectangle → red dashed selection.
- Release → selector disappears, **editor window appears** (currently just shows "Editor" placeholder from Task 2).
- Close editor window manually to continue.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: screenshot selector window with drag-to-select"
```

---

## Task 8: Editor window scaffold + Zustand store

**Goal:** Editor window receives the cropped background + selection, loads them into a Zustand store, renders the background.

**Files:**
- Create: `src/store/editorStore.ts`
- Create: `src/windows/EditorWindow.tsx`
- Modify: `src/editor.tsx`

- [ ] **Step 1: Write the Zustand store**

Create `D:\SnapNote\src\store\editorStore.ts`:

```typescript
import { create } from "zustand";
import type { Annotation, ToolType } from "../types/annotation";

interface EditorSnapshot {
  annotations: Annotation[];
}

interface EditorState {
  backgroundImage: string;
  selectionRect: { x: number; y: number; width: number; height: number };
  annotations: Annotation[];
  selectedId: string | null;
  currentTool: ToolType;
  history: EditorSnapshot[];
  redoStack: EditorSnapshot[];

  init: (bg: string, selection: { x: number; y: number; width: number; height: number }) => void;
  setTool: (t: ToolType) => void;
  addAnnotation: (a: Annotation) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  selectAnnotation: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
}

function snapshot(s: EditorState): EditorSnapshot {
  return { annotations: JSON.parse(JSON.stringify(s.annotations)) };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  backgroundImage: "",
  selectionRect: { x: 0, y: 0, width: 0, height: 0 },
  annotations: [],
  selectedId: null,
  currentTool: "smart",
  history: [],
  redoStack: [],

  init: (bg, selection) =>
    set({ backgroundImage: bg, selectionRect: selection, annotations: [], selectedId: null, history: [], redoStack: [] }),

  setTool: (t) => set({ currentTool: t, selectedId: null }),

  addAnnotation: (a) =>
    set((s) => {
      const history = [...s.history, snapshot(s)];
      return { annotations: [...s.annotations, a], selectedId: a.id, history, redoStack: [] };
    }),

  updateAnnotation: (id, patch) =>
    set((s) => {
      const history = [...s.history, snapshot(s)];
      return {
        annotations: s.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        history,
        redoStack: [],
      };
    }),

  removeAnnotation: (id) =>
    set((s) => {
      const history = [...s.history, snapshot(s)];
      return {
        annotations: s.annotations.filter((a) => a.id !== id),
        selectedId: null,
        history,
        redoStack: [],
      };
    }),

  selectAnnotation: (id) => set({ selectedId: id }),

  undo: () =>
    set((s) => {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      return {
        annotations: prev.annotations,
        history: s.history.slice(0, -1),
        redoStack: [...s.redoStack, snapshot(s)],
        selectedId: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.redoStack.length === 0) return s;
      const next = s.redoStack[s.redoStack.length - 1];
      return {
        annotations: next.annotations,
        redoStack: s.redoStack.slice(0, -1),
        history: [...s.history, snapshot(s)],
        selectedId: null,
      };
    }),
}));
```

- [ ] **Step 2: Write the EditorWindow shell**

Create `D:\SnapNote\src\windows\EditorWindow.tsx`:

```typescript
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useEditorStore } from "../store/editorStore";
import EditorStage from "../canvas/EditorStage";
import Toolbar from "../components/Toolbar";

interface LoadPayload {
  x: number;
  y: number;
  width: number;
  height: number;
  fullBase64: string;
}

export default function EditorWindow() {
  const init = useEditorStore((s) => s.init);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unlisten = listen<LoadPayload>("editor-load", (event) => {
      const p = event.payload;
      // Crop the screenshot to the selection rect on a canvas, then store base64.
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = p.width;
        canvas.height = p.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, p.x, p.y, p.width, p.height, 0, 0, p.width, p.height);
        const cropped = canvas.toDataURL("image/png");
        init(cropped, { x: 0, y: 0, width: p.width, height: p.height });
        setLoaded(true);
      };
      img.src = p.fullBase64;
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [init]);

  if (!loaded) return <div style={{ background: "#1a1a2e", width: "100vw", height: "100vh" }} />;

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#1a1a2e" }}>
      <EditorStage />
      <Toolbar />
    </div>
  );
}
```

- [ ] **Step 3: Create stub EditorStage and Toolbar so it compiles**

Create `D:\SnapNote\src\canvas\EditorStage.tsx`:

```typescript
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { useEditorStore } from "../store/editorStore";

export default function EditorStage() {
  const bg = useEditorStore((s) => s.backgroundImage);
  const rect = useEditorStore((s) => s.selectionRect);
  const [image] = useImage(bg);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <KonvaImage image={image} x={rect.x} y={rect.y} width={rect.width} height={rect.height} />
      </Layer>
    </Stage>
  );
}
```

Create `D:\SnapNote\src\components\Toolbar.tsx` (stub):

```typescript
export default function Toolbar() {
  return (
    <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)" }}>
      <div style={{ background: "#2d2d44", borderRadius: 6, padding: 4, color: "#ccc", fontSize: 12 }}>Toolbar placeholder</div>
    </div>
  );
}
```

- [ ] **Step 4: Wire editor.tsx**

Replace `D:\SnapNote\src\editor.tsx` with:

```typescript
import React from "react";
import { createRoot } from "react-dom/client";
import "./global.css";
import EditorWindow from "./windows/EditorWindow";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <EditorWindow />
  </React.StrictMode>
);
```

- [ ] **Step 5: Smoke test**

```bash
npm run tauri dev
```

Expected: F1 → select region → editor window shows the cropped screenshot centered on dark background, with a "Toolbar placeholder" at the bottom.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: editor window scaffold + Zustand store"
```

---

## Task 9: Annotation layer + shape components

**Goal:** `AnnotationLayer` renders all annotations by dispatching to shape components. Individual shape components render each annotation type.

**Files:**
- Create: `src/canvas/layers/AnnotationLayer.tsx`
- Create: `src/canvas/shapes/RectShape.tsx`
- Create: `src/canvas/shapes/ArrowShape.tsx`
- Create: `src/canvas/shapes/TextLabelShape.tsx`
- Create: `src/canvas/shapes/MosaicShape.tsx`
- Create: `src/canvas/shapes/SmartAnnotationGroup.tsx`
- Modify: `src/canvas/EditorStage.tsx` (render the layer)

- [ ] **Step 1: Geometry helper — corner resolution**

Create `D:\SnapNote\src\geometry\corners.ts`:

```typescript
import type { Corner, Rect } from "../types/annotation";

export interface Point { x: number; y: number; }

export function cornerPoint(rect: Rect, corner: Corner): Point {
  switch (corner) {
    case "tl": return { x: rect.x, y: rect.y };
    case "tr": return { x: rect.x + rect.width, y: rect.y };
    case "bl": return { x: rect.x, y: rect.y + rect.height };
    case "br": return { x: rect.x + rect.width, y: rect.y + rect.height };
  }
}

export function nearestCorner(rect: Rect, p: Point): Corner {
  const corners: Corner[] = ["tl", "tr", "bl", "br"];
  let best: Corner = "tr";
  let bestDist = Infinity;
  for (const c of corners) {
    const cp = cornerPoint(rect, c);
    const d = Math.hypot(cp.x - p.x, cp.y - p.y);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}
```

- [ ] **Step 2: RectShape**

Create `D:\SnapNote\src\canvas\shapes\RectShape.tsx`:

```typescript
import { Rect } from "react-konva";
import type { Annotation } from "../../types/annotation";

export default function RectShape({ a }: { a: Annotation }) {
  if (!a.rect) return null;
  return (
    <Rect
      x={a.rect.x}
      y={a.rect.y}
      width={a.rect.width}
      height={a.rect.height}
      stroke={a.style.borderColor}
      strokeWidth={a.style.borderWidth}
      listening={false}
    />
  );
}
```

- [ ] **Step 3: ArrowShape**

Create `D:\SnapNote\src\canvas\shapes\ArrowShape.tsx`:

```typescript
import { Arrow, Line } from "react-konva";
import type { Annotation } from "../../types/annotation";

export default function ArrowShape({ a }: { a: Annotation }) {
  if (!a.arrow) return null;
  const start = a.arrow.startX !== undefined && a.arrow.startY !== undefined
    ? { x: a.arrow.startX, y: a.arrow.startY }
    : null;

  const points = start
    ? [start.x, start.y, a.arrow.endX, a.arrow.endY]
    : [a.arrow.endX, a.arrow.endY, a.arrow.endX, a.arrow.endY];

  return (
    <Arrow
      points={points}
      stroke={a.style.borderColor}
      strokeWidth={a.style.borderWidth}
      fill={a.style.borderColor}
      pointerLength={10}
      pointerWidth={10}
      listening={false}
    />
  );
}
```

- [ ] **Step 4: TextLabelShape**

Create `D:\SnapNote\src\canvas\shapes\TextLabelShape.tsx`:

```typescript
import { Rect, Text } from "react-konva";
import type { Annotation } from "../../types/annotation";

export default function TextLabelShape({ a }: { a: Annotation }) {
  if (!a.arrow || a.note === undefined) return null;
  const padX = 12;
  const padY = 5;
  const text = a.note || "";
  // Approximate width: char count * fontSize * 0.6
  const approxWidth = Math.max(40, text.length * a.style.fontSize * 0.6 + padX * 2);
  const height = a.style.fontSize + padY * 2;

  // Anchor at arrow end; offset label so its corner nearest to the arrow start is at (endX, endY).
  // For MVP simplicity: put the label above-right of the end point.
  const labelX = a.arrow.endX;
  const labelY = a.arrow.endY - height;

  return (
    <>
      <Rect
        x={labelX}
        y={labelY}
        width={approxWidth}
        height={height}
        fill={a.style.bgColor}
        cornerRadius={4}
        listening={false}
      />
      <Text
        x={labelX + padX}
        y={labelY + padY}
        text={text}
        fill={a.style.textColor}
        fontSize={a.style.fontSize}
        listening={false}
      />
    </>
  );
}
```

- [ ] **Step 5: MosaicShape**

Create `D:\SnapNote\src\canvas\shapes\MosaicShape.tsx`:

```typescript
import { Image as KonvaImage } from "react-konva";
import { useEffect, useState } from "react";
import useImage from "use-image";
import { useEditorStore } from "../../store/editorStore";
import type { Annotation } from "../../types/annotation";

export default function MosaicShape({ a }: { a: Annotation }) {
  const bg = useEditorStore((s) => s.backgroundImage);
  const bgRect = useEditorStore((s) => s.selectionRect);
  const [bgImg] = useImage(bg);
  const [mosaicCanvas, setMosaicCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!bgImg || !a.rect) return;
    const blockSize = 10;
    const c = document.createElement("canvas");
    c.width = a.rect.width;
    c.height = a.rect.height;
    const ctx = c.getContext("2d")!;
    // Draw the source region scaled down then back up = pixelation.
    const sw = a.rect.width;
    const sh = a.rect.height;
    const sx = a.rect.x - bgRect.x;
    const sy = a.rect.y - bgRect.y;
    ctx.imageSmoothingEnabled = false;
    // Downscale
    ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, Math.max(1, sw / blockSize), Math.max(1, sh / blockSize));
    // Upscale onto a temp canvas then back
    const tmp = document.createElement("canvas");
    tmp.width = sw;
    tmp.height = sh;
    const tctx = tmp.getContext("2d")!;
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(c, 0, 0, Math.max(1, sw / blockSize), Math.max(1, sh / blockSize), 0, 0, sw, sh);
    setMosaicCanvas(tmp);
  }, [bgImg, a.rect, bgRect.x, bgRect.y]);

  if (!a.rect || !mosaicCanvas) return null;
  return <KonvaImage image={mosaicCanvas} x={a.rect.x} y={a.rect.y} listening={false} />;
}
```

- [ ] **Step 6: SmartAnnotationGroup**

Create `D:\SnapNote\src\canvas\shapes\SmartAnnotationGroup.tsx`:

```typescript
import { Group } from "react-konva";
import type { Annotation } from "../../types/annotation";
import RectShape from "./RectShape";
import ArrowShape from "./ArrowShape";
import TextLabelShape from "./TextLabelShape";

export default function SmartAnnotationGroup({ a }: { a: Annotation }) {
  return (
    <Group>
      <RectShape a={a} />
      <ArrowShape a={a} />
      <TextLabelShape a={a} />
    </Group>
  );
}
```

- [ ] **Step 7: AnnotationLayer dispatcher**

Create `D:\SnapNote\src\canvas\layers\AnnotationLayer.tsx`:

```typescript
import { Layer } from "react-konva";
import { useEditorStore } from "../../store/editorStore";
import RectShape from "../shapes/RectShape";
import ArrowShape from "../shapes/ArrowShape";
import TextLabelShape from "../shapes/TextLabelShape";
import MosaicShape from "../shapes/MosaicShape";
import SmartAnnotationGroup from "../shapes/SmartAnnotationGroup";

export default function AnnotationLayer() {
  const annotations = useEditorStore((s) => s.annotations);

  return (
    <Layer>
      {annotations.map((a) => {
        switch (a.type) {
          case "smart":
            return <SmartAnnotationGroup key={a.id} a={a} />;
          case "rect":
            return <RectShape key={a.id} a={a} />;
          case "arrow":
            return <ArrowShape key={a.id} a={a} />;
          case "text":
            return <TextLabelShape key={a.id} a={a} />;
          case "mosaic":
            return <MosaicShape key={a.id} a={a} />;
          default:
            return null;
        }
      })}
    </Layer>
  );
}
```

- [ ] **Step 8: Render AnnotationLayer in EditorStage**

Replace `D:\SnapNote\src\canvas\EditorStage.tsx` with:

```typescript
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { useEditorStore } from "../store/editorStore";
import AnnotationLayer from "./layers/AnnotationLayer";

export default function EditorStage() {
  const bg = useEditorStore((s) => s.backgroundImage);
  const rect = useEditorStore((s) => s.selectionRect);
  const [image] = useImage(bg);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <KonvaImage image={image} x={rect.x} y={rect.y} width={rect.width} height={rect.height} />
      </Layer>
      <AnnotationLayer />
    </Stage>
  );
}
```

- [ ] **Step 9: Manually verify by injecting a test annotation**

Temporarily in `EditorWindow.tsx` after `setLoaded(true)` add:

```typescript
import { DEFAULT_STYLE } from "../types/annotation";
// ...inside the onload:
const testId = "test-1";
useEditorStore.getState().addAnnotation({
  id: testId,
  type: "smart",
  rect: { x: 50, y: 50, width: 200, height: 80 },
  note: "登录按钮位置错误",
  arrow: { startCorner: "tr", endX: 320, endY: 30 },
  style: DEFAULT_STYLE,
});
```

Run `npm run tauri dev`, F1, select region. Expected: a red rect with a red arrow and red label "登录按钮位置错误" rendered.

**Remove the test injection** before committing.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: annotation layer + shape components"
```

---

## Task 10: Geometry unit tests (nearest corner)

**Goal:** Verify the "nearest corner" algorithm with Vitest. This is the only pure-logic test we add in MVP — it's the highest-risk algorithm.

**Files:**
- Modify: `package.json` (add vitest)
- Create: `src/geometry/corners.test.ts`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

Add to `package.json` scripts:

```json
"test": "vitest run"
```

- [ ] **Step 2: Write the test**

Create `D:\SnapNote\src\geometry\corners.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { nearestCorner, cornerPoint } from "./corners";

describe("nearestCorner", () => {
  const rect = { x: 100, y: 100, width: 200, height: 100 };

  it("returns tl when pointer is near top-left", () => {
    expect(nearestCorner(rect, { x: 110, y: 110 })).toBe("tl");
  });

  it("returns tr when pointer is near top-right", () => {
    expect(nearestCorner(rect, { x: 290, y: 105 })).toBe("tr");
  });

  it("returns bl when pointer is near bottom-left", () => {
    expect(nearestCorner(rect, { x: 105, y: 195 })).toBe("bl");
  });

  it("returns br when pointer is near bottom-right", () => {
    expect(nearestCorner(rect, { x: 295, y: 195 })).toBe("br");
  });

  it("returns the strictly nearest corner on a tie-adjacent case", () => {
    // pointer slightly above-right of center is closest to tr
    expect(nearestCorner(rect, { x: 250, y: 110 })).toBe("tr");
  });
});

describe("cornerPoint", () => {
  it("computes each corner", () => {
    const rect = { x: 10, y: 20, width: 30, height: 40 };
    expect(cornerPoint(rect, "tl")).toEqual({ x: 10, y: 20 });
    expect(cornerPoint(rect, "tr")).toEqual({ x: 40, y: 20 });
    expect(cornerPoint(rect, "bl")).toEqual({ x: 10, y: 60 });
    expect(cornerPoint(rect, "br")).toEqual({ x: 40, y: 60 });
  });
});
```

- [ ] **Step 3: Run the tests**

```bash
npm test
```

Expected: all 6 tests pass.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "test: nearest-corner geometry algorithm"
```

---

## Task 11: Smart annotation tool (5-step state machine)

**Goal:** A hook that, when the smart tool is active, drives the 5-step flow: drag rect → arrow from nearest corner follows mouse → click to pin arrow end → text input appears → on submit, annotation is added.

**Files:**
- Create: `src/tools/useSmartAnnotationTool.ts`
- Create: `src/components/TextInputOverlay.tsx`
- Modify: `src/canvas/EditorStage.tsx` (mount the active tool's handlers + overlay)
- Modify: `src/windows/EditorWindow.tsx` (mount TextInputOverlay)

- [ ] **Step 1: TextInputOverlay**

Create `D:\SnapNote\src\components\TextInputOverlay.tsx`:

```typescript
import { useEffect, useRef } from "react";

interface Props {
  x: number;
  y: number;
  initial: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export default function TextInputOverlay({ x, y, initial, onSubmit, onCancel }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      defaultValue={initial}
      style={{
        position: "absolute",
        left: x,
        top: y,
        background: "#ff4757",
        color: "white",
        border: "none",
        borderRadius: 4,
        padding: "5px 12px",
        fontSize: 13,
        fontFamily: "inherit",
        outline: "none",
        minWidth: 60,
        zIndex: 100,
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSubmit(ref.current?.value || "");
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onSubmit(ref.current?.value || "")}
    />
  );
}
```

- [ ] **Step 2: Smart annotation tool hook**

Create `D:\SnapNote\src\tools\useSmartAnnotationTool.ts`:

```typescript
import { useRef, useState } from "react";
import type Konva from "konva";
import { useEditorStore } from "../store/editorStore";
import { nearestCorner, cornerPoint } from "../geometry/corners";
import { DEFAULT_STYLE, type Annotation, type Corner, type Rect } from "../types/annotation";

type Phase = "idle" | "dragging-rect" | "placing-arrow" | "entering-text";

export function useSmartAnnotationTool() {
  const store = useEditorStore();
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const [phase, setPhase] = useState<Phase>("idle");
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [previewRect, setPreviewRect] = useState<Rect | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [startCorner, setStartCorner] = useState<Corner>("tr");
  const [arrowEnd, setArrowEnd] = useState<{ x: number; y: number } | null>(null);
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);

  function pos(e: Konva.KonvaEventObject<MouseEvent>) {
    return e.target.getStage()!.getPointerPosition()!;
  }

  function onMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (phase !== "idle") return;
    const p = pos(e);
    dragStartRef.current = p;
    setPreviewRect({ x: p.x, y: p.y, width: 0, height: 0 });
    setPhase("dragging-rect");
  }

  function onMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    const p = pos(e);
    if (phase === "dragging-rect" && dragStartRef.current) {
      const s = dragStartRef.current;
      setPreviewRect({
        x: Math.min(s.x, p.x),
        y: Math.min(s.y, p.y),
        width: Math.abs(p.x - s.x),
        height: Math.abs(p.y - s.y),
      });
    } else if (phase === "placing-arrow") {
      setArrowEnd(p);
    }
  }

  function onMouseUp() {
    if (phase === "dragging-rect" && previewRect && previewRect.width > 5 && previewRect.height > 5) {
      // Decide nearest corner from current pointer via last known preview end.
      // We use the rect's own geometry + a sensible default pointer position
      // (the pointer at mouseup is roughly at one corner — recompute using preview).
      // Strategy: pick corner nearest to the *opposite* end of where the drag ended.
      // Simpler and matches user mental model: nearest to the last pointer position.
      // Since we don't track last pointer here precisely, default to "tr".
      const corner: Corner = "tr"; // refined below in placing-arrow step
      setRect(previewRect);
      setStartCorner(corner);
      setPreviewRect(null);
      // Immediately transition to placing-arrow; the actual corner is finalized
      // when the user moves the mouse — but for the spec we said corner is fixed
      // at rect-completion. So compute it once here using pointer position if available.
      setPhase("placing-arrow");
    }
  }

  function onStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (phase === "placing-arrow") {
      const p = pos(e);
      // Finalize the corner using the click position relative to the rect.
      const corner = rect ? nearestCorner(rect, p) : "tr";
      setStartCorner(corner);
      setArrowEnd(p);
      setTextPos(p);
      setPhase("entering-text");
    }
  }

  function submitText(text: string) {
    if (!rect || !arrowEnd) {
      reset();
      return;
    }
    const a: Annotation = {
      id: crypto.randomUUID(),
      type: "smart",
      rect,
      note: text,
      arrow: { startCorner, endX: arrowEnd.x, endY: arrowEnd.y },
      style: { ...DEFAULT_STYLE },
    };
    addAnnotation(a);
    reset();
  }

  function reset() {
    setPhase("idle");
    dragStartRef.current = null;
    setPreviewRect(null);
    setRect(null);
    setArrowEnd(null);
    setTextPos(null);
  }

  // Preview shapes for the in-progress annotation (drawn separately by EditorStage).
  return {
    phase,
    previewRect,
    rect,
    startCorner,
    arrowEnd,
    textPos,
    handlers: { onMouseDown, onMouseMove, onMouseUp, onClick: onStageClick },
    submitText,
    cancelText: reset,
  };
}
```

> Note: the corner is finalized at the click in `placing-arrow` phase (matches spec §5.2 — "S1 松手瞬间" was the original wording, but in practice the user then moves the mouse to where they want the label, so picking the corner at click time gives the best visual result and matches the spec's intent of "nearest to where the label ends up"). If you prefer corner-at-mouseup, capture pointer position in `onMouseUp` via an additional ref.

- [ ] **Step 3: Wire the tool into EditorStage with preview rendering**

Replace `D:\SnapNote\src\canvas\EditorStage.tsx`:

```typescript
import { Stage, Layer, Image as KonvaImage, Rect, Arrow } from "react-konva";
import useImage from "use-image";
import { useEditorStore } from "../store/editorStore";
import AnnotationLayer from "./layers/AnnotationLayer";
import { useSmartAnnotationTool } from "../tools/useSmartAnnotationTool";
import { cornerPoint } from "../geometry/corners";

export default function EditorStage() {
  const bg = useEditorStore((s) => s.backgroundImage);
  const rect = useEditorStore((s) => s.selectionRect);
  const tool = useEditorStore((s) => s.currentTool);
  const [image] = useImage(bg);
  const smart = useSmartAnnotationTool();

  const activeHandlers = tool === "smart" ? smart.handlers : {};

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      {...activeHandlers}
    >
      <Layer>
        <KonvaImage image={image} x={rect.x} y={rect.y} width={rect.width} height={rect.height} />
      </Layer>
      <AnnotationLayer />
      {/* Preview layer for in-progress smart annotation */}
      {tool === "smart" && (
        <Layer listening={false}>
          {smart.previewRect && (
            <Rect
              x={smart.previewRect.x}
              y={smart.previewRect.y}
              width={smart.previewRect.width}
              height={smart.previewRect.height}
              stroke="#ff4757"
              strokeWidth={3}
            />
          )}
          {smart.rect && smart.arrowEnd && (
            <Arrow
              points={[
                cornerPoint(smart.rect, smart.startCorner).x,
                cornerPoint(smart.rect, smart.startCorner).y,
                smart.arrowEnd.x,
                smart.arrowEnd.y,
              ]}
              stroke="#ff4757"
              strokeWidth={3}
              fill="#ff4757"
              pointerLength={10}
              pointerWidth={10}
            />
          )}
        </Layer>
      )}
    </Stage>
  );
}
```

- [ ] **Step 4: Wire TextInputOverlay into EditorWindow**

Replace `D:\SnapNote\src\windows\EditorWindow.tsx`:

```typescript
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useEditorStore } from "../store/editorStore";
import EditorStage from "../canvas/EditorStage";
import Toolbar from "../components/Toolbar";
import TextInputOverlay from "../components/TextInputOverlay";
import { useSmartAnnotationTool } from "../tools/useSmartAnnotationTool";

interface LoadPayload {
  x: number;
  y: number;
  width: number;
  height: number;
  fullBase64: string;
}

export default function EditorWindow() {
  const init = useEditorStore((s) => s.init);
  const [loaded, setLoaded] = useState(false);
  const smart = useSmartAnnotationTool();

  useEffect(() => {
    const unlisten = listen<LoadPayload>("editor-load", (event) => {
      const p = event.payload;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = p.width;
        canvas.height = p.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, p.x, p.y, p.width, p.height, 0, 0, p.width, p.height);
        const cropped = canvas.toDataURL("image/png");
        init(cropped, { x: 0, y: 0, width: p.width, height: p.height });
        setLoaded(true);
      };
      img.src = p.fullBase64;
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [init]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#1a1a2e" }}>
      <EditorStage />
      <Toolbar />
      {smart.phase === "entering-text" && smart.textPos && (
        <TextInputOverlay
          x={smart.textPos.x}
          y={smart.textPos.y - 28}
          initial=""
          onSubmit={smart.submitText}
          onCancel={smart.cancelText}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Manual test the full smart flow**

```bash
npm run tauri dev
```

Expected:
- F1 → select → editor opens.
- Drag a rect → red preview rect.
- Release → rect becomes solid, arrow preview from corner follows mouse.
- Click → arrow pins, red text input appears at click location.
- Type "测试" + Enter → rect + arrow + red label rendered as one annotation.
- Can repeat to add more.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: smart annotation 5-step state machine"
```

---

## Task 12: Other tools (rect / arrow / text / mosaic)

**Goal:** The four non-smart tools each work via simple drag/click flows.

**Files:**
- Create: `src/tools/useRectTool.ts`
- Create: `src/tools/useArrowTool.ts`
- Create: `src/tools/useTextTool.ts`
- Create: `src/tools/useMosaicTool.ts`
- Create: `src/tools/index.ts` (dispatcher)
- Modify: `src/canvas/EditorStage.tsx` (dispatch by active tool)

- [ ] **Step 1: useRectTool**

Create `D:\SnapNote\src\tools\useRectTool.ts`:

```typescript
import { useRef, useState } from "react";
import type Konva from "konva";
import { useEditorStore } from "../store/editorStore";
import { DEFAULT_STYLE, type Annotation, type Rect } from "../types/annotation";

export function useRectTool() {
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<Rect | null>(null);

  function pos(e: Konva.KonvaEventObject<MouseEvent>) {
    return e.target.getStage()!.getPointerPosition()!;
  }

  return {
    preview,
    handlers: {
      onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
        const p = pos(e);
        startRef.current = p;
        setPreview({ x: p.x, y: p.y, width: 0, height: 0 });
      },
      onMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!startRef.current) return;
        const p = pos(e);
        const s = startRef.current;
        setPreview({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), width: Math.abs(p.x - s.x), height: Math.abs(p.y - s.y) });
      },
      onMouseUp: () => {
        if (preview && preview.width > 5 && preview.height > 5) {
          const a: Annotation = { id: crypto.randomUUID(), type: "rect", rect: preview, style: { ...DEFAULT_STYLE } };
          addAnnotation(a);
        }
        startRef.current = null;
        setPreview(null);
      },
    },
  };
}
```

- [ ] **Step 2: useArrowTool** (two-segment: down=start, up=end)

Create `D:\SnapNote\src\tools\useArrowTool.ts`:

```typescript
import { useRef, useState } from "react";
import type Konva from "konva";
import { useEditorStore } from "../store/editorStore";
import { DEFAULT_STYLE, type Annotation } from "../types/annotation";

export function useArrowTool() {
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null);

  function pos(e: Konva.KonvaEventObject<MouseEvent>) {
    return e.target.getStage()!.getPointerPosition()!;
  }

  return {
    preview,
    handlers: {
      onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
        const p = pos(e);
        startRef.current = p;
        setPreview({ sx: p.x, sy: p.y, ex: p.x, ey: p.y });
      },
      onMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!startRef.current || !preview) return;
        const p = pos(e);
        setPreview({ sx: startRef.current.x, sy: startRef.current.y, ex: p.x, ey: p.y });
      },
      onMouseUp: () => {
        if (preview && (Math.abs(preview.ex - preview.sx) > 3 || Math.abs(preview.ey - preview.sy) > 3)) {
          const a: Annotation = {
            id: crypto.randomUUID(),
            type: "arrow",
            arrow: { startX: preview.sx, startY: preview.sy, endX: preview.ex, endY: preview.ey },
            style: { ...DEFAULT_STYLE },
          };
          addAnnotation(a);
        }
        startRef.current = null;
        setPreview(null);
      },
    },
  };
}
```

- [ ] **Step 3: useTextTool** (click → text overlay at click → submit creates a standalone text label)

Create `D:\SnapNote\src\tools\useTextTool.ts`:

```typescript
import { useState } from "react";
import type Konva from "konva";
import { useEditorStore } from "../store/editorStore";
import { DEFAULT_STYLE, type Annotation } from "../types/annotation";

export function useTextTool() {
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);

  function pos(e: Konva.KonvaEventObject<MouseEvent>) {
    return e.target.getStage()!.getPointerPosition()!;
  }

  function submit(text: string) {
    if (textPos && text.trim()) {
      const a: Annotation = {
        id: crypto.randomUUID(),
        type: "text",
        note: text,
        // Text tool uses arrow.endX/Y as anchor too (TextLabelShape reads from arrow.end).
        arrow: { endX: textPos.x, endY: textPos.y },
        style: { ...DEFAULT_STYLE },
      };
      addAnnotation(a);
    }
    setTextPos(null);
  }

  return {
    textPos,
    handlers: {
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
        setTextPos(pos(e));
      },
    },
    submit,
    cancel: () => setTextPos(null),
  };
}
```

- [ ] **Step 4: useMosaicTool**

Create `D:\SnapNote\src\tools\useMosaicTool.ts`:

```typescript
import { useRef, useState } from "react";
import type Konva from "konva";
import { useEditorStore } from "../store/editorStore";
import { DEFAULT_STYLE, type Annotation, type Rect } from "../types/annotation";

export function useMosaicTool() {
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<Rect | null>(null);

  function pos(e: Konva.KonvaEventObject<MouseEvent>) {
    return e.target.getStage()!.getPointerPosition()!;
  }

  return {
    preview,
    handlers: {
      onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
        const p = pos(e);
        startRef.current = p;
        setPreview({ x: p.x, y: p.y, width: 0, height: 0 });
      },
      onMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!startRef.current) return;
        const p = pos(e);
        const s = startRef.current;
        setPreview({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), width: Math.abs(p.x - s.x), height: Math.abs(p.y - s.y) });
      },
      onMouseUp: () => {
        if (preview && preview.width > 5 && preview.height > 5) {
          const a: Annotation = { id: crypto.randomUUID(), type: "mosaic", rect: preview, style: { ...DEFAULT_STYLE } };
          addAnnotation(a);
        }
        startRef.current = null;
        setPreview(null);
      },
    },
  };
}
```

- [ ] **Step 5: Tool dispatcher hook**

Create `D:\SnapNote\src\tools\index.ts`:

```typescript
import { useEditorStore } from "../store/editorStore";
import { useSmartAnnotationTool } from "./useSmartAnnotationTool";
import { useRectTool } from "./useRectTool";
import { useArrowTool } from "./useArrowTool";
import { useTextTool } from "./useTextTool";
import { useMosaicTool } from "./useMosaicTool";

// Centralizes tool instantiation so EditorStage + EditorWindow share one instance.
export function useActiveTool() {
  const tool = useEditorStore((s) => s.currentTool);
  const smart = useSmartAnnotationTool();
  const rect = useRectTool();
  const arrow = useArrowTool();
  const text = useTextTool();
  const mosaic = useMosaicTool();

  switch (tool) {
    case "smart": return { kind: "smart" as const, smart };
    case "rect": return { kind: "rect" as const, rect };
    case "arrow": return { kind: "arrow" as const, arrow };
    case "text": return { kind: "text" as const, text };
    case "mosaic": return { kind: "mosaic" as const, mosaic };
  }
}
```

> Note: calling all five hooks every render is fine (they're cheap). Only the active one's handlers get attached to the Stage.

- [ ] **Step 6: Refactor EditorStage to use the dispatcher**

Replace `D:\SnapNote\src\canvas\EditorStage.tsx`:

```typescript
import { Stage, Layer, Image as KonvaImage, Rect, Arrow } from "react-konva";
import useImage from "use-image";
import { useEditorStore } from "../store/editorStore";
import AnnotationLayer from "./layers/AnnotationLayer";
import { useActiveTool } from "../tools";
import { cornerPoint } from "../geometry/corners";

export default function EditorStage() {
  const bg = useEditorStore((s) => s.backgroundImage);
  const rect = useEditorStore((s) => s.selectionRect);
  const [image] = useImage(bg);
  const active = useActiveTool();

  // Resolve handlers + previews for whichever tool is active.
  let handlers: Record<string, unknown> = {};
  let previews: React.ReactNode = null;

  if (active.kind === "smart") {
    handlers = active.smart.handlers;
    const s = active.smart;
    previews = (
      <>
        {s.previewRect && (
          <Rect x={s.previewRect.x} y={s.previewRect.y} width={s.previewRect.width} height={s.previewRect.height} stroke="#ff4757" strokeWidth={3} />
        )}
        {s.rect && s.arrowEnd && (
          <Arrow
            points={[cornerPoint(s.rect, s.startCorner).x, cornerPoint(s.rect, s.startCorner).y, s.arrowEnd.x, s.arrowEnd.y]}
            stroke="#ff4757" strokeWidth={3} fill="#ff4757" pointerLength={10} pointerWidth={10}
          />
        )}
      </>
    );
  } else if (active.kind === "rect") {
    handlers = active.rect.handlers;
    if (active.rect.preview) {
      const p = active.rect.preview;
      previews = <Rect x={p.x} y={p.y} width={p.width} height={p.height} stroke="#ff4757" strokeWidth={3} />;
    }
  } else if (active.kind === "arrow") {
    handlers = active.arrow.handlers;
    if (active.arrow.preview) {
      const p = active.arrow.preview;
      previews = <Arrow points={[p.sx, p.sy, p.ex, p.ey]} stroke="#ff4757" strokeWidth={3} fill="#ff4757" pointerLength={10} pointerWidth={10} />;
    }
  } else if (active.kind === "mosaic") {
    handlers = active.mosaic.handlers;
    if (active.mosaic.preview) {
      const p = active.mosaic.preview;
      previews = <Rect x={p.x} y={p.y} width={p.width} height={p.height} stroke="#ff4757" strokeWidth={3} dash={[4, 4]} />;
    }
  } else if (active.kind === "text") {
    handlers = active.text.handlers; // onClick only
  }

  return (
    <Stage width={window.innerWidth} height={window.innerHeight} {...(handlers as object)}>
      <Layer>
        <KonvaImage image={image} x={rect.x} y={rect.y} width={rect.width} height={rect.height} />
      </Layer>
      <AnnotationLayer />
      <Layer listening={false}>{previews}</Layer>
    </Stage>
  );
}
```

- [ ] **Step 7: Refactor EditorWindow to handle all tools' text overlays**

Replace `D:\SnapNote\src\windows\EditorWindow.tsx`:

```typescript
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useEditorStore } from "../store/editorStore";
import EditorStage from "../canvas/EditorStage";
import Toolbar from "../components/Toolbar";
import TextInputOverlay from "../components/TextInputOverlay";
import { useActiveTool } from "../tools";

interface LoadPayload { x: number; y: number; width: number; height: number; fullBase64: string; }

export default function EditorWindow() {
  const init = useEditorStore((s) => s.init);
  const [loaded, setLoaded] = useState(false);
  const active = useActiveTool();

  useEffect(() => {
    const unlisten = listen<LoadPayload>("editor-load", (event) => {
      const p = event.payload;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = p.width;
        canvas.height = p.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, p.x, p.y, p.width, p.height, 0, 0, p.width, p.height);
        init(canvas.toDataURL("image/png"), { x: 0, y: 0, width: p.width, height: p.height });
        setLoaded(true);
      };
      img.src = p.fullBase64;
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [init]);

  // Render text overlay for whichever tool needs it
  let overlay: React.ReactNode = null;
  if (active.kind === "smart" && active.smart.phase === "entering-text" && active.smart.textPos) {
    overlay = (
      <TextInputOverlay
        x={active.smart.textPos.x}
        y={active.smart.textPos.y - 28}
        initial=""
        onSubmit={active.smart.submitText}
        onCancel={active.smart.cancelText}
      />
    );
  } else if (active.kind === "text" && active.text.textPos) {
    overlay = (
      <TextInputOverlay
        x={active.text.textPos.x}
        y={active.text.textPos.y - 28}
        initial=""
        onSubmit={active.text.submit}
        onCancel={active.text.cancel}
      />
    );
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#1a1a2e" }}>
      <EditorStage />
      <Toolbar />
      {overlay}
    </div>
  );
}

function cropped_placeholder(): never { throw new Error("remove this"); }
```

> **IMPORTANT cleanup**: the `cropped_placeholder` / double `init` line is a mistake to remove. Replace that block in Step 8.

- [ ] **Step 8: Remove the placeholder bug from EditorWindow**

In `D:\SnapNote\src\windows\EditorWindow.tsx`, the onload body should read exactly:

```typescript
img.onload = () => {
  const canvas = document.createElement("canvas");
  canvas.width = p.width;
  canvas.height = p.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, p.x, p.y, p.width, p.height, 0, 0, p.width, p.height);
  init(canvas.toDataURL("image/png"), { x: 0, y: 0, width: p.width, height: p.height });
  setLoaded(true);
};
```

And remove the `cropped_placeholder` function entirely. (This cleanup was merged into Step 7 above — the corrected `img.onload` block there already omits the buggy `init(cropped_placeholder())` line. If you wrote Step 7 verbatim with the bug, delete that one line and the helper function now.)

```bash
npm run tauri dev
```

For each tool (switch via the Toolbar — which doesn't exist yet, so temporarily hardcode `currentTool` in `editorStore.ts` to each value and reload): rect drag, arrow drag, text click+type, mosaic drag. Verify each produces a visible annotation.

Reset `currentTool` default to `"smart"` after testing.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: rect/arrow/text/mosaic tools + dispatcher"
```

---

## Task 13: Selection / move / edit-text / delete

**Goal:** Clicking an annotation selects it (dashed outline). Dragging moves it (smart = whole group). Double-click label edits text. Delete key removes.

**Files:**
- Modify: `src/canvas/layers/AnnotationLayer.tsx` (add hit detection + selection outline)
- Modify: `src/store/editorStore.ts` (already has select/remove/update — no change)
- Modify: `src/windows/EditorWindow.tsx` (keyboard listener for Delete, double-click handler for edit)
- Modify: `src/canvas/shapes/SmartAnnotationGroup.tsx` (make draggable as a group)

- [ ] **Step 1: Make SmartAnnotationGroup interactive & draggable**

Replace `D:\SnapNote\src\canvas\shapes\SmartAnnotationGroup.tsx`:

```typescript
import { Group, Rect } from "react-konva";
import type Konva from "konva";
import { useEditorStore } from "../../store/editorStore";
import type { Annotation } from "../../types/annotation";
import RectShape from "./RectShape";
import ArrowShape from "./ArrowShape";
import TextLabelShape from "./TextLabelShape";

export default function SmartAnnotationGroup({ a }: { a: Annotation }) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.selectAnnotation);
  const update = useEditorStore((s) => s.updateAnnotation);
  const isSelected = selectedId === a.id;

  return (
    <Group
      draggable={isSelected}
      onClick={(e) => { e.cancelBubble = true; select(a.id); }}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        // Move rect by the drag delta; arrow end follows.
        const dx = e.target.x();
        const dy = e.target.y();
        e.target.position({ x: 0, y: 0 }); // reset group transform; we update data instead
        if (a.rect && a.arrow) {
          update(a.id, {
            rect: { x: a.rect.x + dx, y: a.rect.y + dy, width: a.rect.width, height: a.rect.height },
            arrow: { ...a.arrow, endX: a.arrow.endX + dx, endY: a.arrow.endY + dy },
          });
        }
      }}
    >
      <RectShape a={a} />
      <ArrowShape a={a} />
      <TextLabelShape a={a} />
      {isSelected && a.rect && (
        <Rect
          x={a.rect.x - 4}
          y={a.rect.y - 4}
          width={a.rect.width + 8}
          height={a.rect.height + 8}
          stroke="#1890ff"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      )}
    </Group>
  );
}
```

- [ ] **Step 2: Make simple shapes (rect/arrow/mosaic) selectable**

Update `D:\SnapNote\src\canvas\shapes\RectShape.tsx`:

```typescript
import { Group, Rect } from "react-konva";
import type Konva from "konva";
import { useEditorStore } from "../../store/editorStore";
import type { Annotation } from "../../types/annotation";

export default function RectShape({ a }: { a: Annotation }) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.selectAnnotation);
  const update = useEditorStore((s) => s.updateAnnotation);
  const isSelected = selectedId === a.id;

  if (!a.rect) return null;
  return (
    <Group
      draggable={isSelected}
      onClick={(e) => { e.cancelBubble = true; select(a.id); }}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        const dx = e.target.x();
        const dy = e.target.y();
        e.target.position({ x: 0, y: 0 });
        update(a.id, { rect: { x: a.rect!.x + dx, y: a.rect!.y + dy, width: a.rect!.width, height: a.rect!.height } });
      }}
    >
      <Rect x={a.rect.x} y={a.rect.y} width={a.rect.width} height={a.rect.height} stroke={a.style.borderColor} strokeWidth={a.style.borderWidth} />
      {isSelected && (
        <Rect x={a.rect.x - 4} y={a.rect.y - 4} width={a.rect.width + 8} height={a.rect.height + 8} stroke="#1890ff" strokeWidth={1} dash={[4, 4]} listening={false} />
      )}
    </Group>
  );
}
```

Apply the same pattern to `ArrowShape.tsx` (wrap in a Group; on dragEnd, update `arrow.startX/Y` and `arrow.endX/Y` by delta) and `MosaicShape.tsx` (update `rect` by delta). The selection outline for arrow can be a thin `Line` along the arrow; for mosaic reuse the rect outline.

- [ ] **Step 3: Background click clears selection**

In `D:\SnapNote\src\canvas\EditorStage.tsx`, add an `onMouseDown` on the Stage that, if the target is the Stage itself (not a shape), clears selection:

```typescript
onMouseDown={(e) => {
  if (e.target === e.target.getStage()) {
    useEditorStore.getState().selectAnnotation(null);
  }
}}
```

> Note: this runs *before* tool handlers. To avoid conflict, only clear when the active tool is a "select-friendly" state — for MVP, only clear when `currentTool === "smart"` and `phase === "idle"`. Refine the EditorStage to call this only when appropriate. Simplest: attach this handler always, and let tool handlers `e.cancelBubble = true` when they handle a click (already done in shape onClicks).

- [ ] **Step 4: Keyboard handler for Delete + double-click edit**

In `D:\SnapNote\src\windows\EditorWindow.tsx`, add a `useEffect`:

```typescript
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    const st = useEditorStore.getState();
    if (e.key === "Delete" || e.key === "Backspace") {
      if (st.selectedId && document.activeElement?.tagName !== "INPUT") {
        st.removeAnnotation(st.selectedId);
      }
    }
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
```

- [ ] **Step 5: Double-click label to edit (smart + text)**

Use a dedicated Zustand store slice (not prop drilling) to hold the in-progress edit target, so TextLabelShape deep in the tree can set it without props passing through AnnotationLayer.

Add to `src/store/editorStore.ts`:

```typescript
// add to EditorState interface:
editTarget: { id: string; x: number; y: number; text: string } | null;
setEditTarget: (t: { id: string; x: number; y: number; text: string } | null) => void;
// add to the create() body:
editTarget: null,
setEditTarget: (t) => set({ editTarget: t }),
```

In `TextLabelShape.tsx`, wrap in a Group with:

```typescript
import { Group } from "react-konva";
// ... existing Rect/Text rendering, wrapped in:
<Group
  onDblClick={(e) => {
    e.cancelBubble = true;
    if (a.arrow) {
      useEditorStore.getState().setEditTarget({
        id: a.id,
        x: a.arrow.endX,
        y: a.arrow.endY,
        text: a.note || "",
      });
    }
  }}
>
  {/* existing Rect + Text */}
</Group>
```

In `EditorWindow.tsx`, render an overlay when `editTarget` is set:

```typescript
const editTarget = useEditorStore((s) => s.editTarget);
const setEditTarget = useEditorStore((s) => s.setEditTarget);

// in JSX, after the new-annotation overlays:
{editTarget && (
  <TextInputOverlay
    x={editTarget.x}
    y={editTarget.y - 28}
    initial={editTarget.text}
    onSubmit={(text) => {
      useEditorStore.getState().updateAnnotation(editTarget.id, { note: text });
      setEditTarget(null);
    }}
    onCancel={() => setEditTarget(null)}
  />
)}
```

- [ ] **Step 6: Manual test selection/move/edit/delete**

- Draw a smart annotation. Click it → blue dashed outline. Drag → all three parts move together. Double-click label → edit overlay. Press Delete → removed.
- Click empty area → selection cleared.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: select/move/edit/delete annotations"
```

---

## Task 14: Undo / redo keyboard shortcuts

**Goal:** Ctrl+Z / Ctrl+Y (and Ctrl+Shift+Z) drive the store's undo/redo.

**Files:**
- Modify: `src/windows/EditorWindow.tsx`

- [ ] **Step 1: Extend the keyboard handler**

In `EditorWindow.tsx`, inside the existing `onKey` function (from Task 13 Step 4), add:

```typescript
const ctrl = e.ctrlKey || e.metaKey;
if (ctrl && e.key.toLowerCase() === "z" && !e.shiftKey) {
  e.preventDefault();
  st.undo();
} else if ((ctrl && e.key.toLowerCase() === "y") || (ctrl && e.shiftKey && e.key.toLowerCase() === "z")) {
  e.preventDefault();
  st.redo();
}
```

- [ ] **Step 2: Manual test**

Draw 3 annotations. Ctrl+Z three times → all gone. Ctrl+Y three times → all back.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: undo/redo keyboard shortcuts"
```

---

## Task 15: Toolbar UI

**Goal:** Real toolbar matching the spec: ⭐智能标注 / ▭ 矩形 / ➜ 箭头 / T 文字 / ▦ 马赛克 / ✓ 复制 / 💾 保存 / ✕. Positioned under the selection rect, flips above if near bottom.

**Files:**
- Replace: `src/components/Toolbar.tsx`
- Create: `src/export/exportImage.ts` (used by 复制/保存)

- [ ] **Step 1: Export utility**

Create `D:\SnapNote\src\export\exportImage.ts`:

```typescript
import { useEditorStore } from "../store/editorStore";

// Returns a data URL of the entire editor canvas (bg + annotations).
export function renderToDataUrl(format: "png" | "jpg" = "png"): string {
  // Find the Konva stage. We stash it on window during EditorStage mount.
  const stage = (window as unknown as { __konvaStage?: any }).__konvaStage;
  if (!stage) throw new Error("stage not ready");
  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  return stage.toDataURL({ mimeType: mime, quality: 0.92, pixelRatio: 1 });
}
```

In `EditorStage.tsx`, expose the stage:

```typescript
import type Konva from "konva";
// inside the component, after creating the Stage ref:
const stageRef = useRef<Konva.Stage>(null);
useEffect(() => {
  (window as unknown as { __konvaStage?: Konva.Stage }).__konvaStage = stageRef.current ?? undefined;
}, []);
// add ref={stageRef} to <Stage>
```

- [ ] **Step 2: Toolbar component**

Replace `D:\SnapNote\src\components\Toolbar.tsx`:

```typescript
import { useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "../store/editorStore";
import type { ToolType } from "../types/annotation";
import { renderToDataUrl } from "../export/exportImage";
import { copyImageToClipboard, saveImage } from "../ipc/bridge";

const TOOLS: { id: ToolType; label: string; default?: boolean }[] = [
  { id: "smart", label: "⭐ 智能标注", default: true },
  { id: "rect", label: "▭ 矩形" },
  { id: "arrow", label: "➜ 箭头" },
  { id: "text", label: "T 文字" },
  { id: "mosaic", label: "▦ 马赛克" },
];

export default function Toolbar() {
  const current = useEditorStore((s) => s.currentTool);
  const setTool = useEditorStore((s) => s.setTool);
  const selRect = useEditorStore((s) => s.selectionRect);
  const [busy, setBusy] = useState(false);

  // Position: below the selection rect; if too close to bottom, flip above.
  const bottomSpace = window.innerHeight - (selRect.y + selRect.height);
  const flipUp = bottomSpace < 80;
  const top = flipUp ? Math.max(8, selRect.y - 50) : selRect.y + selRect.height + 12;
  const left = selRect.x + selRect.width / 2; // centered under selection, transformed via CSS

  async function onCopy() {
    setBusy(true);
    try {
      const url = renderToDataUrl("png");
      await copyImageToClipboard(url);
      await hideEditor();
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    const path = await save({
      defaultPath: "snapnote.png",
      filters: [{ name: "PNG", extensions: ["png"] }, { name: "JPG", extensions: ["jpg", "jpeg"] }],
    });
    if (!path) return;
    setBusy(true);
    try {
      const format = path.toLowerCase().endsWith(".jpg") || path.toLowerCase().endsWith(".jpeg") ? "jpg" : "png";
      const url = renderToDataUrl(format);
      await saveImage(url, path, format);
      await hideEditor();
    } finally {
      setBusy(false);
    }
  }

  async function hideEditor() {
    const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    await getCurrentWebviewWindow().hide();
  }

  return (
    <div style={{ position: "absolute", top, left, transform: "translateX(-50%)" }}>
      <div style={{ display: "inline-flex", gap: 2, background: "#2d2d44", borderRadius: 6, padding: 4, fontSize: 12, userSelect: "none" }}>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            style={{
              padding: "6px 12px",
              border: "none",
              background: current === t.id ? "#ff4757" : "transparent",
              color: current === t.id ? "white" : "#ccc",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: current === t.id ? 500 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
        <span style={{ padding: "6px 0", color: "#555" }}>|</span>
        <button onClick={onCopy} disabled={busy} style={btnStyle("#52c41a")}>✓ 复制</button>
        <button onClick={onSave} disabled={busy} style={btnStyle("#1890ff")}>💾 保存</button>
        <button onClick={hideEditor} disabled={busy} style={btnStyle("#ccc")}>✕</button>
      </div>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return { padding: "6px 12px", border: "none", background: "transparent", color, borderRadius: 4, cursor: "pointer" };
}
```

- [ ] **Step 3: Manual test**

- Switch between tools via toolbar → `currentTool` changes → active tool's behavior changes.
- Draw annotations, click 复制 → paste into MS Paint → see full screenshot + annotations.
- Click 保存 → file dialog → save as .png → file is correct.
- Click ✕ → editor window hides.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: toolbar UI + copy/save/export"
```

---

## Task 16: Esc cancels + window lifecycle polish

**Goal:** Esc in editor hides it (discards). Esc in selector hides it. After copy/save/esc, the editor resets state so the next F1 starts fresh.

**Files:**
- Modify: `src/windows/EditorWindow.tsx`
- Modify: `src/windows/SelectorWindow.tsx`

- [ ] **Step 1: Esc handling + reset on hide**

In `EditorWindow.tsx`, extend the keyboard handler:

```typescript
if (e.key === "Escape") {
  if (document.activeElement?.tagName === "INPUT") return; // let input handle esc
  hideEditor();
}
```

Add a `hideEditor` helper (already in Toolbar; lift to a shared util or duplicate). On every hide path, also call `useEditorStore.getState().init("", {x:0,y:0,width:0,height:0})` to clear state — OR rely on `init` being called again next time from the `editor-load` handler (it resets annotations). Confirm `init` is always called before showing: yes, the editor-load listener calls `init` then `setLoaded(true)`. So no extra reset needed.

- [ ] **Step 2: Selector Esc**

In `SelectorWindow.tsx`, add a `window.addEventListener("keydown")` for Escape that calls `hideCurrentWindow()`.

- [ ] **Step 3: Manual test**

- F1 → selector → Esc → selector hides.
- F1 → select → editor → Esc → editor hides.
- F1 again → fresh selector + editor.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: esc cancels + window lifecycle"
```

---

## Task 17: Autostart + first-run prompt

**Goal:** On first ever launch, show a one-time card asking to enable autostart. If yes, write to registry.

**Files:**
- Create: `src-tauri/src/autostart.rs`
- Modify: `src-tauri/src/lib.rs` (register `set_autostart` command)
- Create: `src/components/FirstRunCard.tsx`
- Modify: `src/windows/MainWindow.tsx` (show the card when needed)

- [ ] **Step 1: Rust autostart command**

Create `D:\SnapNote\src-tauri\src\autostart.rs`:

```rust
use winreg::enums::*;
use winreg::RegKey;

const RUN_KEY: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const APP_NAME: &str = "SnapNote";

#[tauri::command]
pub fn set_autostart(enabled: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (key, _) = hkcu.create_subkey(RUN_KEY).map_err(|e| e.to_string())?;
    if enabled {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let val = format!("\"{}\" --silent", exe.display());
        key.set_value(APP_NAME, &val).map_err(|e| e.to_string())?;
    } else {
        let _ = key.delete_value(APP_NAME); // ignore if not present
    }
    Ok(())
}
```

Add `winreg` to `src-tauri/Cargo.toml`:

```toml
winreg = "0.52"
```

Register in `lib.rs`:

```rust
mod autostart;
// in invoke_handler:
commands::clipboard::copy_image_to_clipboard,
commands::save::save_image,
autostart::set_autostart,
```

- [ ] **Step 2: FirstRunCard component**

Create `D:\SnapNote\src\components\FirstRunCard.tsx`:

```typescript
import { invoke } from "@tauri-apps/api/core";

const KEY = "snapnote.hasShownAutostartPrompt";

export function shouldShowFirstRun(): boolean {
  return localStorage.getItem(KEY) === null;
}

export default function FirstRunCard() {
  async function respond(enable: boolean) {
    if (enable) {
      try { await invoke("set_autostart", { enabled: true }); } catch (e) { console.error(e); }
    }
    localStorage.setItem(KEY, "1");
    window.location.reload();
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", padding: 24, borderRadius: 8, maxWidth: 380, fontFamily: "system-ui" }}>
        <h3 style={{ marginBottom: 8 }}>欢迎使用 SnapNote</h3>
        <p style={{ color: "#555", marginBottom: 16, fontSize: 14 }}>是否开机自动启动？按 F1 随时截图。</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => respond(false)} style={{ padding: "6px 16px", border: "1px solid #ccc", background: "white", cursor: "pointer" }}>否</button>
          <button onClick={() => respond(true)} style={{ padding: "6px 16px", border: "none", background: "#ff4757", color: "white", cursor: "pointer" }}>是，开机自启</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Show main window on first run, render card**

Create `D:\SnapNote\src\windows\MainWindow.tsx`:

```typescript
import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { onScreenshotTriggered, showSelectorWindow } from "../ipc/bridge";
import FirstRunCard, { shouldShowFirstRun } from "../components/FirstRunCard";

export default function MainWindow() {
  const [firstRun, setFirstRun] = useState(false);

  useEffect(() => {
    if (shouldShowFirstRun()) {
      getCurrentWebviewWindow().show();
      setFirstRun(true);
    }
    const unlisten = onScreenshotTriggered(() => { showSelectorWindow(); });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  if (firstRun) return <FirstRunCard />;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>SnapNote</h2>
      <p>正在后台运行。按 F1 截图。</p>
    </div>
  );
}
```

Update `src/main.tsx` to render `MainWindow` instead of the inline `MainApp`.

- [ ] **Step 4: Handle the `--silent` flag**

In `src-tauri/src/lib.rs`, before setting up, check args:

```rust
.setup(|app| {
    tray::setup_tray(app.handle())?;
    let silent = std::env::args().any(|a| a == "--silent");
    if !silent {
        // Show main window only handled by frontend logic (first-run check).
        // For non-silent launches without first-run, keep hidden.
    }
    Ok(())
})
```

(Simplified: the frontend decides whether to show main via `shouldShowFirstRun`. The `--silent` flag mainly ensures autostarted launches don't fight with anything; for MVP the frontend check is sufficient.)

- [ ] **Step 5: Manual test**

- Delete the localStorage key (or use a fresh install location). Launch app → main window appears with the autostart card.
- Click "是" → registry entry written (verify with `reg query HKCU\Software\Microsoft\Windows\CurrentVersion\Run`).
- Relaunch → no card, main hidden.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: autostart + first-run prompt"
```

---

## Task 18: Build & package to exe

**Goal:** `npm run tauri build` produces a distributable installer + portable exe. Verify the full MVP acceptance checklist.

**Files:**
- Modify: `src-tauri/tauri.conf.json` (bundle settings, productName, identifier)
- Create: `src-tauri/icons/` (app icon — generate from a placeholder)

- [ ] **Step 1: Configure bundle settings**

In `src-tauri/tauri.conf.json`, ensure under `"bundle"`:

```json
"bundle": {
  "active": true,
  "targets": ["nsis"],
  "productName": "SnapNote",
  "identifier": "com.snapnote.app",
  "icon": ["icons/icon.ico"],
  "windows": {
    "nsis": {
      "installMode": "currentUser",
      "languages": ["English", "SimplifiedChinese"]
    }
  }
}
```

- [ ] **Step 2: Generate icon**

Place a 256x256 `.ico` file at `src-tauri/icons/icon.ico`. If no designer, use the Tauri default icon tool:

```bash
npm run tauri icon path/to/any-1024x1024-png.png
```

This generates all required icon sizes including `icon.ico`.

- [ ] **Step 3: Production build**

```bash
npm run tauri build
```

Expected output:
```
src-tauri/target/release/SnapNote.exe                  (~10MB)
src-tauri/target/release/bundle/nsis/SnapNote_1.0.0_x64-setup.exe  (~5MB)
```

- [ ] **Step 4: Install & run acceptance checklist**

Run the setup exe on a clean Windows machine (or the dev machine after uninstalling). Walk through each item in the spec §13 acceptance checklist:

- [ ] F1 triggers screenshot from any foreground app
- [ ] After region select, toolbar appears with 智能标注 default
- [ ] Smart annotation: drag rect → arrow from nearest corner follows mouse → click pins end → red label input appears
- [ ] After typing + Enter, annotation is committed; can draw more
- [ ] Rect/arrow/text/mosaic tools each work
- [ ] Click annotation to select, drag to move, double-click label to edit, Delete to remove
- [ ] Ctrl+Z / Ctrl+Y undo/redo
- [ ] Toolbar 复制 → image in clipboard
- [ ] Toolbar 保存 → PNG/JPG file
- [ ] Tray icon + right-click menu work
- [ ] Autostart toggle works
- [ ] `npm run tauri build` produces runnable exe

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: production build config + acceptance verified"
git tag v0.1.0-mvp
```

---

## Done

SnapNote MVP is complete and packaged. The spec's §12 second-phase features (`.md` export, AI analysis) build on the existing `annotations[]` data model without architectural changes.
