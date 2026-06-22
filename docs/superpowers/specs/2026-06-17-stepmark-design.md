# SnapNote 设计文档

- **状态**：Draft（待用户评审）
- **日期**：2026-06-17
- **作者**：brainstorming session 输出
- **目标读者**：实施者（含 AI Agent 协作开发）

---

## 1. 项目概述

SnapNote 是一款 **Windows 桌面截图批注工具**，定位对标 [Snipaste](https://zh.snipaste.com/)，核心差异化卖点是 **「智能标注」工具**：用户框选一个区域后，一步生成「红框 + 箭头 + 文字标签」组合，无需像传统工具那样分别切换矩形/箭头/文字工具。

目标用户场景：
- 日常截图反馈问题（产品/UI/实施验收）
- 医疗信息化项目的需求评审、系统验收、缺陷反馈
- 第二阶段（不在本设计范围内）会扩展为「问题清单导出」和「AI 分析」

---

## 2. 范围

### 2.1 MVP 包含

| 能力 | 说明 |
|------|------|
| 截图 | F1 全局快捷键触发，支持区域框选截图 |
| 智能标注工具 | 拖框 → 箭头从最近角出+跟鼠标 → 点一下定终点 → 红底文字框 |
| 普通工具 | 矩形、箭头、文字、马赛克 |
| 多标注 | 一张截图支持 N 个标注并存 |
| 编辑能力 | 选中 / 移动 / 改字 / 删除 |
| 撤销重做 | Ctrl+Z / Ctrl+Y |
| 导出 | PNG、JPG 保存；复制到剪贴板 |
| 启动 | 全局热键 + 开机自启（可选）+ 系统托盘 |

### 2.2 MVP 不包含（留给后续阶段）

- 问题清单 `.md` 导出
- AI 分析（调用大模型识别 UI/字段问题）
- 多屏/超宽屏的高 DPI 边角优化（遇到再补）
- macOS / Linux 支持

---

## 3. 技术架构

### 3.1 技术栈

| 层 | 选型 | 理由 |
|----|------|------|
| 桌面框架 | **Tauri 2.x** | 单 exe 打包（~10MB）、WebView2 复用系统引擎、Rust 原生系统能力 |
| 前端 | **React 18 + TypeScript + Vite** | AI 协作友好、生态成熟 |
| 画布 | **Konva.js** | 声明式 Canvas、内置事件/拖拽/变换，适合标注编辑器 |
| 状态管理 | **Zustand** | 比 Redux 轻、比 Context 易测 |
| 截图底层 | **xcap**（Rust crate） | 跨平台、依赖少、能最快跑通主流程 |
| 全局热键 | Tauri `global-shortcut` 插件 | 封装 Win32 `RegisterHotKey` |
| 系统托盘 | Tauri `tray` API | 原生托盘图标 + 右键菜单 |
| 剪贴板 | Tauri `clipboard-manager` 插件 | 写图片到系统剪贴板 |

### 3.2 进程/窗口模型

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri 主进程 (Rust)                    │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ screenshot   │  │ hotkey       │  │ clipboard     │  │
│  │ (xcap)       │  │ (global-     │  │ (clipboard-   │  │
│  │              │  │  shortcut)   │  │  manager)     │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         └─────────┬───────┴──────────────────┘          │
│         ┌─────────▼──────────┐                          │
│         │  IPC bridge        │                          │
│         └─────────┬──────────┘                          │
└───────────────────┼─────────────────────────────────────┘
                    │ invoke / event
┌───────────────────┼─────────────────────────────────────┐
│              前端 WebView (React + Vite)                 │
│         ┌─────────▼──────────┐                          │
│         │  Zustand Store     │                          │
│         │  - editorState     │                          │
│         │  - annotations[]   │                          │
│         │  - history stacks  │                          │
│         └─────────┬──────────┘                          │
│         ┌─────────▼──────────┐                          │
│         │  Konva Stage       │                          │
│         │  - Background img  │                          │
│         │  - AnnotationLayer │                          │
│         │  - OverlayLayer    │                          │
│         └────────────────────┘                          │
└─────────────────────────────────────────────────────────┘
```

**窗口模型**：

| 窗口 | 平时状态 | 何时显示 | 何时隐藏 |
|------|---------|---------|---------|
| 主窗口（隐藏） | `visible: false` | 用户点托盘「显示主窗口」 | 启动后立即隐藏 |
| 截图选区窗口（全屏无边框透明） | 不存在 | F1 触发时创建 | 选区确认后销毁 |
| 编辑器窗口（全屏无边框） | 不存在 | 选区确认后创建 | 复制/保存/Esc 后销毁 |

主窗口的存在仅为满足「托盘菜单有『主窗口』入口」和未来的设置面板。日常截图流程不经过主窗口。

---

## 4. 启动与生命周期

### 4.1 启动方式（三种并存）

1. **全局快捷键 `F1`**（核心入口）
   - 注册时机：主进程启动时
   - 实现：`tauri-plugin-global-shortcut` → Win32 `RegisterHotKey`
   - 行为：任何前台应用下按 F1 → 触发截图选区窗口

2. **开机自启**（可选，首次启动询问）
   - 实现：写入注册表 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
   - 启动参数：`--silent`（跳过主窗口，直接进托盘）
   - **首次运行检测**：主进程启动时读 `localStorage` 的 `hasShownAutostartPrompt`。若无此 key，强制显示主窗口（覆盖默认隐藏），主窗口内弹一次性引导卡片："是否开机自启？[是] [否] [不再询问]"。用户选完写入 key，之后启动恢复默认隐藏行为。

3. **系统托盘**
   - 左键单击图标 = 触发截图（等同 F1）
   - 右键菜单：
     ```
     📷 截图          (F1)
     🖥 显示主窗口
     ⚙ 设置（快捷键/自启/样式）
     ─────────
     退出
     ```

### 4.2 主流程时序

```
用户按 F1
   ↓
Rust: 暂停热键监听 → xcap 截全屏 → 返回 base64
   ↓
前端: 创建「截图选区窗口」（全屏、置顶、半透明遮罩、十字光标）
   ↓
用户: 鼠标拖选区域 → 松手
   ↓
前端: 裁剪选区 → 销毁选区窗口 → 创建「编辑器窗口」
   ↓
用户: 画标注（智能标注/矩形/箭头/文字/马赛克）
   ↓
用户: 点工具栏「复制到剪贴板」或「保存」
   ↓
前端: Konva stage.toCanvas() → 导出图片
   ↓
Rust: 写入剪贴板 / 写文件
   ↓
前端: 销毁编辑器窗口 → Rust 恢复热键监听
```

---

## 5. 核心交互设计 —— 智能标注

这是 SnapNote 区别于 Snipaste 的核心，必须实现精确。

### 5.1 完整状态机

```
[空闲] ──F1──> [截图选区] ──松手──> [编辑器/工具栏默认智能标注]
                                              │
                                              ▼
                                    [S1: 拖框]
                                    鼠标按下→拖动→松手
                                    生成矩形线框
                                              │
                                              ▼
                                    [S2: 箭头预览]
                                    从「离鼠标最近的角」
                                    伸出箭头，末端跟鼠标
                                              │
                                              ▼
                                    [S3: 定箭头终点]
                                    左键点击 → 箭头定格
                                              │
                                              ▼
                                    [S4: 输入文字]
                                    箭头终点处弹出红底
                                    文字框，光标聚焦
                                              │
                                              ▼
                                    [S5: 完成]
                                    回车/点空白 → 标注入库
                                    回到 [编辑器/可继续画]
```

### 5.2 「箭头从最近的角出」算法

矩形 4 个角：`tl`(左上) / `tr`(右上) / `bl`(左下) / `br`(右下)。

S1 松手瞬间，取鼠标当前位置 `(mx, my)`，计算到 4 个角的欧氏距离，取最小者作为箭头起点角 `startCorner`。这个角在后续矩形移动/缩放时**自动重算坐标**（因为存的是角标识，不是绝对坐标）。

```
dist = sqrt((mx - cornerX)² + (my - cornerY)²)
startCorner = argmin(dist)
```

### 5.3 箭头终点与标签锚点

S3 用户点击的位置 `(endX, endY)` 同时是：
- 箭头终点
- 文字标签的锚点

**标签定位规则**（明确，避免歧义）：标签以 `(endX, endY)` 为锚点，向**远离矩形中心**的方向排版。具体由 `startCorner` 决定锚点在标签的哪个角：

| startCorner | 标签锚点位置 | 标签向哪个方向延伸 |
|-------------|------------|------------------|
| `tl`（左上角出发） | 标签右下角 | 向左上 |
| `tr`（右上角出发） | 标签左下角 | 向右上 |
| `bl`（左下角出发） | 标签右上角 | 向左下 |
| `br`（右下角出发） | 标签左上角 | 向右下 |

这样标签永远在箭头末端外侧，不会与矩形或箭头重叠。若标签接近屏幕边缘导致溢出，则沿箭头法线方向反向调整（实现细节，不阻塞 MVP）。

### 5.4 视觉规格（默认值，用户可在设置中改）

| 元素 | 规格 |
|------|------|
| 矩形边框 | 3px，实线，颜色 `#ff4757` |
| 箭头 | 3px，颜色 `#ff4757`，实心三角箭头头 |
| 标签背景 | `#ff4757`，圆角 4px，padding 5px 12px |
| 标签文字 | 白色 `#ffffff`，13px，font-weight 500 |
| 字体 | 跟随系统（`font-family: system-ui`） |
| 马赛克 | 块大小 10px，像素化 |

---

## 6. 工具栏

### 6.1 工具项

```
[⭐ 智能标注(默认)] [▭ 矩形] [➜ 箭头] [T 文字] [▦ 马赛克] | [✓ 复制] [💾 保存] [✕]
```

### 6.2 各工具行为

| 工具 | 操作 | 产出 |
|------|------|------|
| 智能标注 | 见 §5 状态机：拖框 → 箭头从最近角出+跟鼠标 → 点定终点 → 文字框 | rect + arrow + label 组合 |
| 矩形 | 拖框（按下→拖动→松手） | 单独矩形线框 |
| 箭头 | 两段式：按下定起点 → 拖动预览 → 松手定终点（与智能标注的箭头逻辑独立，**不绑定矩形**） | 单独箭头 |
| 文字 | 点位置 → 原位输入框 → 回车确认 | 单独文字 |
| 马赛克 | 拖框 | 该区域像素化 |
| 复制 | 点击 | 整图写入剪贴板，关闭编辑器 |
| 保存 | 点击 | 弹文件对话框，PNG/JPG |
| ✕ | 点击 | 放弃，关闭编辑器 |

> **注**：普通「箭头」工具与智能标注里的箭头是两套独立交互 —— 前者是独立箭头（按下-拖动-松手，不绑定任何矩形），后者是智能标注流程的一部分（从矩形角出发、跟鼠标、点击定终点）。两者共用 `ArrowShape` 渲染组件，但由不同的 Tool 类驱动状态机。

### 6.3 工具栏位置

浮动在选区**下边缘外侧**（贴近但不遮挡内容），Snipaste 同款。选区靠近屏幕底部时自动翻到上方。

---

## 7. 数据模型

### 7.1 Annotation

```typescript
interface Annotation {
  id: string;                              // uuid
  type: 'smart' | 'rect' | 'arrow' | 'text' | 'mosaic';

  rect?: {                                 // smart / rect / mosaic 用
    x: number; y: number;
    width: number; height: number;
  };

  note?: string;                           // smart / text 用

  arrow?: {                                // smart / arrow 用
    startCorner: 'tl' | 'tr' | 'bl' | 'br';   // smart 模式存角标识
    startX?: number; startY?: number;          // arrow 模式存绝对坐标
    endX: number; endY: number;
  };

  style: {
    borderColor: string;                   // 默认 '#ff4757'
    borderWidth: number;                   // 默认 3
    bgColor: string;                       // 默认 '#ff4757'
    textColor: string;                     // 默认 '#ffffff'
    fontSize: number;                      // 默认 13
  };
}
```

### 7.2 EditorState（Zustand store）

```typescript
interface EditorState {
  backgroundImage: string;                 // 截图 base64
  annotations: Annotation[];               // 按 z-order（=创建顺序）
  selectedId: string | null;               // 当前选中标注
  currentTool: ToolType;                   // 当前工具
  history: EditorSnapshot[];               // 撤销栈
  redoStack: EditorSnapshot[];

  // actions
  addAnnotation(a: Annotation): void;
  updateAnnotation(id: string, patch: Partial<Annotation>): void;
  removeAnnotation(id: string): void;
  selectAnnotation(id: string | null): void;
  undo(): void;
  redo(): void;
}
```

`history` 存 `annotations` 数组的深拷贝快照，每次结构性变更（增/删/改完）压栈。撤销/重做即快照替换。

---

## 8. 编辑能力

| 操作 | 触发 | 行为 |
|------|------|------|
| 选中 | 点击标注任意部分（矩形/箭头/标签） | 高亮虚线框 + 显示删除按钮 |
| 移动 | 选中后拖动 | rect 移动；smart 模式下箭头起点随角重算、终点和标签跟随 |
| 改字 | 双击标签 | 原位弹出输入框，回车确认 |
| 删除 | 选中后按 Delete 或点删除按钮 | 移除该标注，压撤销栈 |
| 取消选中 | 点空白区域 | selectedId = null |

**移动时的几何同步**（smart 标注）：
- 矩形移动 `(dx, dy)`
- 箭头起点 = 矩形新位置对应角（重算）
- 箭头终点 `(endX, endY)` += `(dx, dy)`（整体跟随）
- 标签锚点 = 终点位置（跟随）

---

## 9. Rust 后端接口

### 9.1 Tauri commands

```rust
#[tauri::command]
async fn capture_screen() -> Result<String, String>;
// 返回全屏截图 base64

#[tauri::command]
async fn copy_image_to_clipboard(base64: String) -> Result<(), String>;

#[tauri::command]
async fn save_image(base64: String, path: String, format: String) -> Result<(), String>;

#[tauri::command]
async fn set_autostart(enabled: bool) -> Result<(), String>;
```

### 9.2 事件

- `screenshot-triggered`（Rust → 前端）：F1 按下时触发
- `screenshot-ready`（Rust → 前端）：截图完成，携带 base64

---

## 10. 目录结构

```
SnapNote/
├── docs/
│   └── superpowers/specs/
│       └── 2026-06-17-snapnote-design.md     ← 本文档
├── src/                                        ← 前端
│   ├── main.tsx
│   ├── App.tsx
│   ├── windows/
│   │   ├── ScreenshotSelector.tsx             ← 选区窗口
│   │   └── Editor.tsx                          ← 编辑器窗口
│   ├── canvas/
│   │   ├── EditorStage.tsx                    ← Konva 画布
│   │   ├── layers/
│   │   │   ├── BackgroundLayer.tsx
│   │   │   ├── AnnotationLayer.tsx
│   │   │   └── OverlayLayer.tsx
│   │   └── shapes/
│   │       ├── SmartAnnotation.tsx
│   │       ├── RectShape.tsx
│   │       ├── ArrowShape.tsx
│   │       ├── TextShape.tsx
│   │       └── MosaicShape.tsx
│   ├── tools/
│   │   ├── SmartAnnotationTool.ts             ← 智能标注状态机
│   │   ├── RectTool.ts
│   │   ├── ArrowTool.ts
│   │   ├── TextTool.ts
│   │   └── MosaicTool.ts
│   ├── store/
│   │   └── editorStore.ts                     ← Zustand
│   ├── components/
│   │   ├── Toolbar.tsx
│   │   └── TextInputOverlay.tsx
│   └── types/
│       └── annotation.ts
├── src-tauri/                                  ← Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/
│   │   │   ├── screenshot.rs
│   │   │   ├── clipboard.rs
│   │   │   └── save.rs
│   │   └── autostart.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── vite.config.ts
```

---

## 11. 打包与发布

### 11.1 构建命令

```bash
npm run tauri build
```

Tauri 自动：① `cargo build --release` ② `vite build` ③ 前端嵌入 exe ④ 生成 NSIS 安装包 + 便携版 exe。

### 11.2 产物

```
src-tauri/target/release/
├── SnapNote.exe                                 ← 主程序 ~10MB（前端已嵌入）
└── bundle/nsis/
    └── SnapNote_1.0.0_x64-setup.exe             ← 安装包 ~5MB
```

### 11.3 运行依赖

- **WebView2 Runtime**（Win10 1803+ / Win11 默认自带）
- 安装包可勾选「自动下载 WebView2」兜底

### 11.4 发布方式

- 安装版：分发 setup.exe
- 绿色版：分发单文件 SnapNote.exe

---

## 12. 第二阶段预留（不在 MVP）

| 能力 | 复用 MVP 的什么 |
|------|----------------|
| 问题清单 `.md` 导出 | `annotations[]` 已有 `id/note/rect`，直接遍历生成 Markdown |
| AI 分析 | 截图 base64 直接喂大模型；标注数据作为结构化上下文 |
| 产品评审记录 | 复用导出管线，换模板 |

数据模型已经为这些预留了字段，第二阶段是纯增量工作。

---

## 13. 验收标准（MVP）

- [ ] F1 能在任意前台应用下触发截图
- [ ] 框选截图区域后出现工具栏，默认选中智能标注
- [ ] 智能标注：拖框 → 箭头从最近角出并跟鼠标 → 点一下定终点 → 弹红底文字框
- [ ] 文字输入后回车，标注入库，可继续画下一个
- [ ] 矩形/箭头/文字/马赛克 4 个普通工具各自可用
- [ ] 点击标注可选中、拖动移动、双击改字、Delete 删除
- [ ] Ctrl+Z / Ctrl+Y 撤销重做
- [ ] 工具栏「复制到剪贴板」可把整图复制到系统剪贴板
- [ ] 工具栏「保存」可导出 PNG/JPG
- [ ] 系统托盘图标 + 右键菜单可用
- [ ] 可设置开机自启
- [ ] `npm run tauri build` 产出可双击运行的 exe
