# AGENTS.md

> 给进入本项目的 AI Agent（Claude / Codex / Copilot 等）阅读。
> 先读这一份，再读 `docs/superpowers/` 下的 spec 和 plan。

---

## 项目简介

**SnapNote** —— Windows 桌面截图批注工具，对标 [Snipaste](https://zh.snipaste.com/)。

核心差异化卖点：**「智能标注」工具** —— 用户在截图上拖一个框，一步生成「红框 + 箭头 + 文字标签」组合，不需要像传统工具那样分别切换矩形/箭头/文字工具。

目标用户场景：日常截图反馈问题、医疗信息化项目的需求评审与系统验收。

---

## 当前状态

- **阶段**：规划完成，**代码尚未开始**。
- Git 已初始化，只有 1 个 commit（docs）。
- 下一步：按 `docs/superpowers/plans/2026-06-17-snapnote-mvp.md` 执行 18 个 Task。
- 执行方式建议：subagent-driven-development（每个 Task 派一个 subagent）。

---

## 必读文档（按优先级）

| 文档 | 内容 | 何时读 |
|------|------|--------|
| `docs/superpowers/specs/2026-06-17-snapnote-design.md` | 完整设计：架构、交互状态机、数据模型、验收标准 | 开始任何编码前 |
| `docs/superpowers/plans/2026-06-17-snapnote-mvp.md` | 18 个 Task 的逐步实施计划，每步含代码 | 执行时逐 Task 读 |

**不要凭记忆/猜测实现**，所有交互细节、字段定义、视觉规格都在这两份文档里。遇到分歧以 spec 为准。

---

## 不可变决策（Do NOT change without user approval）

这些是 brainstorming 阶段和用户确认锁定的，subagent 不得擅自更改：

| 维度 | 决策 |
|------|------|
| 平台 | **仅 Windows x64**。不做 macOS/Linux |
| 技术栈 | **Tauri 2 + React 18 + TypeScript + Vite + Konva.js + Zustand**。不要换成 Electron / 纯 Rust UI / 其他状态库 |
| 截图底层 | **xcap crate**。不要用 WinRT Graphics.Capture / GDI |
| 触发快捷键 | **F1**（跟 Snipaste 一致） |
| 流程 | Snipaste 式两阶段：F1 框选 → 工具栏编辑 |
| 智能标注交互 | 5 步状态机，详见 spec §5。**箭头起点 = 离鼠标最近的角**，终点由用户点击确定 |
| 视觉风格 | Snipaste 经典：3px 线宽、`#ff4757`、字体跟随系统 |
| 工具栏工具 | 智能标注 / 矩形 / 箭头 / 文字 / **马赛克** / 复制 / 保存 |
| 多标注 | 支持，并存于一张截图 |
| 编辑能力 | 选中 + 移动 + 改字 + 删除（不做缩放/调样式） |
| 导出 | PNG/JPG + 复制到剪贴板（**MVP 不做** 问题清单.md 和 AI 分析） |
| 打包 | `npm run tauri build` → 单 exe（~10MB），NSIS 安装包 + 便携版 |

---

## 技术栈与版本

- **Rust** 1.95（已装：`C:\Users\Administrator\.cargo\bin`）
- **Node** v22.22（已装）
- **Tauri** 2.x
- **React** 18 + TypeScript
- **Vite**（多入口：main / selector / editor 三个 HTML）
- **Konva.js** + react-konva（画布）
- **Zustand**（状态管理）
- **use-image**（Konva 图片加载）
- **xcap**（截图）
- Rust 插件：`tauri-plugin-global-shortcut`、`tauri-plugin-clipboard-manager`、`tauri-plugin-dialog`
- **winreg**（写入开机自启注册表项）
- **Vitest**（单元测试）

---

## 开发命令

```bash
# 开发模式（带热重载，会启动 Tauri 窗口）
npm run tauri dev

# 前端类型检查 / 构建（不打包 exe）
npm run build

# 单元测试
npm test

# 打包成 exe（产出 src-tauri/target/release/SnapNote.exe 和 NSIS 安装包）
npm run tauri build
```

首次 `npm run tauri dev` 前需要 `npm install`。
首次 `npm run tauri build` 会编译 Rust，耗时较长（几分钟）属正常。

---

## 目录约定

详见 plan 的 "File Structure" 章节。简要：

```
src/
├── windows/        ← 三个窗口的根组件：MainWindow / SelectorWindow / EditorWindow
├── canvas/         ← Konva 画布：EditorStage + layers/ + shapes/
├── tools/          ← 每个工具一个 use*Tool.ts hook（产出 Annotation 数据，不直接画）
├── geometry/       ← 纯几何算法（nearest corner 等），可单测
├── store/          ← Zustand store（editorStore.ts）
├── ipc/            ← Tauri invoke/listen 的类型化封装
├── types/          ← Annotation / EditorState / ToolType 类型
├── components/     ← HTML/React 组件（Toolbar / TextInputOverlay / FirstRunCard）
└── export/         ← 导出图片到剪贴板/文件
src-tauri/src/
├── commands/       ← 每个 Tauri command 一个文件：screenshot / clipboard / save
├── tray.rs         ← 系统托盘
└── autostart.rs    ← 开机自启（注册表）
```

**分层原则**：
- `geometry/`、`types/`、`ipc/` 是纯逻辑模块，不依赖 React，可独立单测。
- 工具 hook（`tools/use*Tool.ts`）**只产出 Annotation 数据**，通过 store 入库；不直接操作画布。
- Shape 组件（`canvas/shapes/`）**只渲染 Annotation**，不包含修改逻辑。
- Rust command 一个文件一个能力，互不依赖。

---

## 编码与提交约定

- **语言**：代码注释和提交信息用**英文**（标准开源实践）；用户面向的 UI 文案用**中文**（工具栏标签、首启引导等）。
- **提交信息**：遵循 plan 中每个 Task 末尾给的 commit message（`feat:` / `chore:` / `test:` / `docs:` 前缀）。
- **频繁提交**：每个 Task 完成就 commit，不要攒着。
- **TDD**：纯逻辑模块（如 `geometry/corners.ts`）先写测试（Task 10 是范例）。涉及 Konva/React 渲染的部分以手动 smoke test 为主（plan 里每个 Task 都有 smoke test 步骤）。
- **行尾**：仓库 `core.autocrlf = true`（Windows 标准），不要手动改。
- **不要**提交 `node_modules/`、`src-tauri/target/`、`.superpowers/`（已在 `.gitignore`）。

---

## 执行计划的注意事项

如果用 subagent-driven-development 执行 plan：

1. **每个 subagent 只读 plan 中对应的那一个 Task**，不要让它读全部 18 个 Task（避免上下文膨胀）。
2. **按 Task 编号顺序执行**，多数 Task 依赖前序产物（如 Task 7 依赖 Task 6 的 IPC bridge）。
3. **每个 Task 完成后做 review**：检查 commit 是否干净、smoke test 是否通过，再进下一个。
4. **plan 中标注的 > Note 块**是重要提醒（如 xcap 版本、Tauri 插件 v2 API 差异），subagent 遇到编译错误时优先查这些。
5. **Task 9 Step 9 和 Task 12 Step 9 的"手动验证"步骤**是为了早期发现渲染问题，不要跳过。
6. 如果某个 Task 的代码跟 plan 写的有出入（比如 crate 版本 API 变了），**以"实现 spec 意图"为准**，不要死扣 plan 的字面代码。

---

## 联系上下文

- **平台**：Windows 10 19045 x64
- **Shell**：cmd.exe
- **工作目录**：`D:\SnapNote`
- **非 git 子模块**，独立项目
