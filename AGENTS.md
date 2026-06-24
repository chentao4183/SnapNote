# AGENTS.md

> 给进入本项目的 AI Agent（Claude / Codex / Copilot 等）阅读。
> 先读本文件,再读 `docs/PROJECT.md`。不要再按历史阶段拆分理解项目。

---

## 项目定位

**StepMark** 是 Windows 桌面截图批注工具,对标 Snipaste,当前按 **V1.0 终结版 MVP** 维护。

核心差异化能力是 **智能标注**：用户在截图上拖拽一次,一步生成「可选目标框 + 箭头 + 文字标签」组合,不需要分别切换矩形、箭头、文字工具。

目标场景:

- 日常截图反馈问题。
- 医疗信息化项目需求评审、系统验收和缺陷反馈。
- 文档/教程截图说明。

---

## 当前状态

- 当前产品口径是 **V1.0 单一版本**。
- 截图、编辑器、智能标注、基础标注、样式自定义、可调裁剪区、自动编号、复制/保存、托盘和开机自启均已完成。
- 旧的拆分文档已经被合并进 `docs/PROJECT.md`,不再作为当前实施入口。
- 唯一保留的后续候选方向是 **AI 分析**：基于截图和标注识别 UI / 字段 / 流程问题。开始前必须先写或更新 `docs/PROJECT.md` 中的规划,并让用户确认。

---

## 必读文档

| 文档 | 用途 |
|------|------|
| `README.md` | 面向用户和开发者的快速入口 |
| `docs/PROJECT.md` | 产品范围、功能说明、架构、数据模型、维护约定 |
| `AGENTS.md` | AI Agent 协作规则 |

除图片资源外,产品和项目计划只维护在上述 Markdown 中。需要补充产品或计划信息时,合并进 `docs/PROJECT.md`。

---

## 不可变决策

| 维度 | 决策 |
|------|------|
| 平台 | 仅 Windows x64,不做 macOS/Linux |
| 技术栈 | Tauri 2 + React 19 + TypeScript + Vite + Konva.js + Zustand |
| 截图底层 | xcap crate,不要改成 WinRT Graphics.Capture / GDI |
| 触发快捷键 | F1 |
| 流程 | F1 框选 → 直接进编辑器 → 批注 → 复制/保存 |
| 智能标注 | 目标框可选矩形/椭圆/无;有目标框时箭头从最近边连接并外移;无目标框时拖出箭头并添加文字标签 |
| 视觉风格 | 默认红色 `#ff4757`,线宽 3px,字体跟随系统;用户可在工具面板调整 |
| 工具栏 | 智能标注 / 矩形 / 箭头 / 文字 / 马赛克 / 复制 / 保存 |
| 多标注 | 支持一张截图内多个标注 |
| 自动编号 | 智能标注默认开启;矩形/箭头/文字可选;同图全局递增;删除不重排 |
| 样式作用域 | 每工具独立配置,只影响新建标注,持久化到 localStorage |
| 导出 | PNG/JPG 保存 + 复制到剪贴板 |

---

## 技术栈与命令

- Rust 1.95（已装:`C:\Users\Administrator\.cargo\bin`）
- Node v22.22（已装）
- Tauri 2.x
- React 19 + TypeScript
- Vite
- Konva.js + react-konva
- Zustand
- Vitest

```bash
npm run tauri dev
npm run build
npm run build:exe
npm test
npm run tauri build
```

首次运行前需要 `npm install`。

固定编译流程:

- 当用户只说“编译”或“编译 exe”时,默认运行 `scripts\build-exe.cmd`,不要重新推演构建命令。
- 该脚本会先无条件关闭正在运行的 `stepmark.exe`（用 `taskkill /F`,容错“进程不存在”），再执行完整 `tauri build`，生成 release exe、MSI 和 NSIS 安装包;主要产物为 `src-tauri\target\release\stepmark.exe`、`src-tauri\target\release\bundle\msi\*.msi`、`src-tauri\target\release\bundle\nsis\*.exe`。
- 脚本有意**不**用 `tasklist | find` 做进程检测：在 Git-bash/MSYS 下裸 `find` 会被解析成 Unix 文件查找工具而非 Windows `find.exe`,导致检测静默失败、进程杀不掉,进而占用 exe 使链接/打包失败。延时用 `ping` 而非 `timeout` 也是同理。修改脚本时请保持这种跨 shell 无外部依赖的写法。
- 在 Codex 沙箱内运行 MSI/NSIS 打包可能因 WiX `light.exe` 环境受限失败;编译安装包时应使用外部环境/提权执行该脚本。

---

## 目录约定

```text
src/
├── windows/        # 三个窗口根组件
├── canvas/         # Konva Stage、图层、Shape
├── tools/          # 各工具 hook,只产出 Annotation 数据
├── geometry/       # 纯几何算法,可单测
├── numbering/      # 自动编号应用逻辑
├── store/          # editorStore / toolStyleStore / numberingStore
├── ipc/            # Tauri invoke/listen 封装
├── types/          # Annotation / Tool / Style 类型
└── components/     # Toolbar / StylePanel / NumberingControls / TextInputOverlay

src-tauri/src/
├── commands/       # screenshot / clipboard / save / autostart
├── tray.rs
└── main.rs

docs/
├── PROJECT.md      # 唯一产品/项目主文档
└── images/         # README 图片资源
```

分层原则:

- `geometry/`、`types/`、`ipc/` 是纯逻辑模块,不依赖 React。
- 工具 hook 只产出数据并写入 store,不直接操作画布。
- Shape 组件只渲染 Annotation,不包含业务修改逻辑。
- Rust command 一个文件一个能力,避免互相耦合。

---

## 编码与提交约定

- 代码注释和提交信息用英文。
- 用户面向 UI 文案用中文。
- 纯逻辑模块优先补单测。
- 涉及 Konva/React 渲染时,自动检查之外还要做手动 smoke test。
- 不提交 `node_modules/`、`src-tauri/target/`、`.superpowers/`。
- 不要把历史阶段叙事重新写回 README 或 `docs/PROJECT.md`。

---

## 当前环境

- 平台: Windows 10 19045 x64
- Shell: PowerShell
- 工作目录: `D:\StepMark`
- 独立 git 项目,非子模块
