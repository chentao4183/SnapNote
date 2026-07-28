# StepMark V1.0 项目主文档

本文档是 StepMark 当前唯一的产品与项目计划主文档。历史拆分文档的有效内容已合并到这里;后续不要再按阶段拆分新文档。

---

## 1. 产品定位

StepMark 是 Windows 桌面截图批注工具,面向日常问题反馈、医疗信息化项目需求评审、系统验收和文档教程截图。

核心卖点是 **智能标注**:用户在截图上拖拽一次,一步生成「可选目标框 + 箭头 + 文字标签」组合。传统截图工具通常需要分别切换矩形、箭头和文字工具;StepMark 把这些动作合成一个工作流,减少截图反馈时的操作成本。

### 目标用户

- 产品、设计、研发协作中需要快速反馈 UI 问题的人。
- 医疗信息化项目经理、实施顾问、验收人员。
- 需要制作操作说明截图的文档作者。

### 当前结论

StepMark 当前按 **V1.0 终结版 MVP** 维护。核心截图批注闭环已经完成,可以作为稳定版本使用。

---

## 2. 已完成能力

| 能力 | 当前状态 |
|------|----------|
| 全局截图热键 | `F1` 触发截图框选 |
| 截图选区 | 全屏透明选择窗口,框选后进入编辑器 |
| 编辑器 | 基于原始截图和 crop 区域渲染,支持调整裁剪范围 |
| 智能标注 | 拖拽生成目标框、箭头、文字标签;目标框可选矩形、椭圆或无 |
| 基础工具 | 矩形/椭圆、箭头、文字、马赛克 |
| 编辑操作 | 选中、移动、缩放、改字、删除、撤销/重做 |
| 每工具样式 | 颜色、线宽、形状、字体、字号、箭头头大小等 |
| 样式持久化 | localStorage,只影响新建标注 |
| 自动编号 | 智能标注默认开启;矩形/箭头/文字可选;同图递增;删除不重排 |
| 导出 | 复制到剪贴板,保存 PNG/JPG |
| 贴图 | 把裁剪+标注后的图贴到屏幕上,多张并存、可拖动、滚轮缩放 |
| 桌面集成 | 系统托盘、可选开机自启 |
| 打包 | Tauri build 输出安装包和便携版 |

---

## 3. 当前不做的事

这些不是 V1.0 范围:

- macOS / Linux 支持。
- 云同步、账号系统、团队协作后台。
- 复杂图形库或高级排版编辑器。
- 长期持久化标注工程文件。

唯一保留的后续候选方向:

- **AI 分析**:基于截图和结构化标注识别 UI / 字段 / 流程问题,用于辅助验收和缺陷反馈。该方向开始前需要先补充需求说明并让用户确认。
- **设置面板**:把散落的偏好(开机自启、快捷键、导出格式、默认保存路径等)统一收口,详见第 10 节。该方向开始前同样需要先补充需求说明并让用户确认。

---

## 4. 核心交互

### 4.1 截图流程

```text
启动 StepMark
  -> 程序驻留系统托盘
  -> 任意应用按 F1
  -> 框选截图区域
  -> 进入编辑器
  -> 批注
  -> 复制或保存
```

### 4.2 智能标注状态

智能标注用于快速生成一组关联标注。目标框形状可选 `矩形`、`椭圆` 或 `无`。

矩形/椭圆模式:

1. 用户拖出目标框。
2. 箭头起点从目标框最近边生成,并略微外移。
3. 用户点击确定箭头终点。
4. 文本输入框出现,输入标签说明。
5. Store 写入一条智能标注 Annotation。

无目标框模式:

1. 用户从目标点按下并拖出箭头。
2. 松开位置作为箭头终点和文本标签锚点。
3. 文本输入框出现,输入标签说明。
4. Store 写入一条不含 `rect` 的智能标注 Annotation。

矩形/椭圆模式下,标签朝远离目标框的方向延伸,左侧标签使用右对齐输入,保证箭头锚点稳定。无目标框模式下,编号和文本标签跟随箭头终点渲染。

### 4.3 自动编号

自动编号是独立 badge,不是文字内容的一部分。

规则:

- 智能标注默认自动编号。
- 矩形、箭头、文字可在工具面板里开启。
- 马赛克不参与编号。
- 同一张截图内共用一个递增序列,每次新截图从 1 开始。
- 删除已有编号不会重排其他编号。
- undo/redo 会恢复对应编号和 `nextNumber`。
- 编号开关、位置和样式持久化到 `stepmark.numbering.v1`。
- `nextNumber` 只属于当前编辑会话,不写入 localStorage。

默认 badge 样式:

- 颜色: `#ff4757`,用于编号框线条和编号文字
- 背景: 透明
- 形状: 圆形
- 字号: 17

### 4.4 贴图

贴图(Pin to screen)把当前裁剪区 + 标注的合成结果作为一张悬浮图片贴到屏幕上,类似 Snipaste 的贴图功能,用于多张截图对比浏览。

入口与生命周期:

- 在编辑器工具栏点「贴图」按钮(或按 `P`),把当前合成图贴出,并自动退出编辑器。
- 每次点击都新建一张贴图窗口(label 形如 `pin-0`、`pin-1`,递增),多张可并存。
- 贴图窗口无边框、始终置顶、不进任务栏;主进程退出时所有贴图自动关闭。
- 贴图本身不持久化,关闭即消失。

交互:

- 拖动:在贴图任意位置按住左键拖动,窗口跟随移动(Tauri `startDragging`)。
- 滚轮缩放:以窗口中心为锚点等比缩放,范围 `[0.1, 8]`,rAF 节流。
- 角点缩放:鼠标移到贴图上时,右下角出现蓝色 ◢ handle,拖动可按对角方向等比缩放。
- 关闭:鼠标移到贴图上时,右上角出现蓝色 × 按钮;或按 `Esc`。
- 复制:`Ctrl+C` 把贴图原图复制到剪贴板。
- 另存:`Ctrl+S` 弹出保存对话框,导出 PNG。

实现要点:

- 贴图复用 `composeDataUrl()` 产出裁剪 + 标注后的 PNG data URL(与复制/保存同一通路)。
- 贴图窗口通过 Tauri 前端 `new WebviewWindow(label, options)` 动态创建,无需新增 Rust command。
- 跨窗口通过 `emitTo(label, "pin-load", { dataUrl, pixelWidth, pixelHeight })` 传图,贴图窗口监听后渲染 `<img>`。
- 缩放几何是纯函数,落在 `src/canvas/pinGeometry.ts`,由 Vitest 覆盖。
- DPI 清晰度以 PNG 的物理像素宽高为真值:贴图默认用 `PhysicalSize` 保持 1:1 像素映射,边框作为覆盖层而不占图片内容区;跨不同缩放比例的屏幕时监听 DPI 变化并重新应用物理尺寸,避免浏览器隐式重采样。

---

## 5. 数据模型

### 5.1 Annotation

前端所有标注都落为 `Annotation` 数据,由工具 hook 产出,由 Shape 组件渲染。

核心字段:

```ts
type ToolType = "select" | "smart" | "rect" | "arrow" | "text" | "mosaic";
type ShapeKind = "rect" | "ellipse";
type SmartShapeKind = ShapeKind | "none";
type LineStyle = "solid" | "dashed";

interface Annotation {
  id: string;
  type: ToolType;
  rect?: Rect;
  shape?: SmartShapeKind;
  lineStyle?: LineStyle;
  arrowHeadSize?: number;
  fontFamily?: string;
  note?: string;
  arrow?: ArrowData;
  style: AnnotationStyle;
  numberBadge?: NumberBadge;
}
```

设计原则:

- 标注样式在创建时固化进 Annotation。
- 后续工具样式变更只影响新建标注。
- 编号 badge 的值和样式在创建时固化,位置按当前编号设置渲染。

### 5.2 Store

| Store | 职责 |
|-------|------|
| `editorStore` | 当前截图、crop、annotations、选中状态、undo/redo、`nextNumber` |
| `toolStyleStore` | 每工具样式设置和 localStorage 持久化 |
| `numberingStore` | 自动编号开关、位置、badge 样式和 localStorage 持久化 |
| `toolState` | 绘制过程中的临时状态 |

---

## 6. 架构

### 6.1 桌面架构

```text
Tauri 主进程
  ├─ screenshot command: xcap 截图
  ├─ clipboard command: 写入系统剪贴板
  ├─ save command: 保存 PNG/JPG
  ├─ autostart command: 注册表开机自启
  └─ tray: 系统托盘

React WebView
  ├─ selector window: 截图选区
  ├─ editor window: Konva 编辑器
  └─ main window: 隐藏窗口,承载托盘和生命周期
```

### 6.2 前端分层

```text
src/
├── windows/        # 窗口根组件
├── canvas/         # Konva Stage、Layer、Shape
├── tools/          # 绘制工具 hook
├── geometry/       # 纯几何算法
├── numbering/      # 自动编号应用 helper
├── store/          # Zustand 状态
├── style/          # 工具样式映射
├── ipc/            # Tauri IPC 封装
├── types/          # 类型定义
└── components/     # Toolbar、StylePanel 等 HTML 组件
```

分层规则:

- `geometry/` 保持纯函数,通过 Vitest 单测覆盖。
- `tools/` 只创建 Annotation 数据,不直接画图。
- `canvas/shapes/` 只根据 Annotation 渲染,不承载业务状态修改。
- `store/` 负责状态变更、历史快照和持久化边界。

---

## 7. 技术栈

| 层 | 技术 |
|----|------|
| 桌面 | Tauri 2 |
| 后端 | Rust |
| 前端 | React 19 + TypeScript + Vite |
| Canvas | Konva.js + react-konva |
| 状态 | Zustand |
| 测试 | Vitest |
| 截图 | xcap |
| 持久化 | localStorage + Windows 注册表开机自启 |

---

## 8. 开发与验证

常用命令:

```bash
npm install
npm run tauri dev
npm test
npm run build
npm run tauri build
```

验证要求:

- 纯逻辑修改需要跑对应 Vitest。
- 跨工具、store、导出链路修改需要跑 `npm test` 和 `npm run build`。
- 涉及截图窗口、编辑器渲染、剪贴板、保存、托盘的修改需要做手动 smoke test。
- 修改产品范围或计划时,只更新 `README.md`、`AGENTS.md`、`docs/PROJECT.md`,不要恢复旧的分散文档结构。

---

## 9. 维护约定

- 当前主版本口径是 V1.0,README 不再列历史阶段。
- 产品计划只维护当前能力和唯一后续候选方向。
- 如果 AI 分析进入实施,先在本文件补充:
  - 用户场景
  - 输入/输出
  - 隐私和本地/云端边界
  - UI 入口
  - 验收标准
- 旧的拆分文档已融合删除,不要重新创建同类碎片文档。
- 代码注释和 commit message 使用英文;用户界面文案使用中文。

---

## 10. 后续候选：设置面板

> 本节是设置功能的规划草案,尚未实施。实施前需用户确认范围,并按 AGENTS.md 的分支流程走。决策类更新要同步回写 AGENTS.md 的「不可变决策」表。

### 10.1 背景与现状缺口

当前 StepMark **没有设置面板**。用户可调项散落在三处,且有明显体验缺口:

| 现状 | 说明 |
|------|------|
| 首启向导(`MainApp.tsx`) | 只出现一次,仅含开机自启开关;看完后用户再也无法改任何偏好 |
| 编辑器内联样式面板(`StylePanel`/`NumberingControls`) | 每工具样式 + 自动编号,已持久化 |
| Rust 端硬编码常量 | F1 快捷键、默认 PNG、默认文件名 `stepmark-{时间戳}`、框选后直接进编辑器、默认工具 smart |

对比 Snipaste 首选项(通用/快捷键/截屏/贴图/输出/高级六类),StepMark 缺：快捷键自定义、截屏行为开关(十字线/放大镜)、默认保存路径与格式选择、开机自启的常驻开关、命名规则、统一的偏好持久化层。

### 10.2 形态决策(已与用户确认)

- **不做独立设置窗口,也不在编辑器/托盘以外增加设置入口。**
- 所有设置项**就地集成在托盘右键菜单**里。结构形态:托盘右键菜单增加「设置」一级项,点击后弹出**轻量原生菜单/子菜单或简易弹层**承载开关类项;需要输入的项(快捷键捕获、保存路径)用最小化的交互。
- 轻量、不占额外常驻窗口是硬约束。后续若发现开关过多放不下,再讨论是否拆子菜单层级,不退回到独立窗口方案。

### 10.3 拟新增设置项(分档)

#### P0 — 基础体验补齐(成本低,建议优先)

| 设置项 | 类型 | 当前状态 | 说明 |
|--------|------|----------|------|
| 开机自启 | 开关 | ✅ 已实施 | 托盘「设置 → 开机自启」常驻开关,任何时候可改;注册表为真值 |
| 截图快捷键 | 快捷键捕获 | ✅ 已实施 | 托盘「设置 → 快捷键」录入;持久化在 Rust `settings.json`(见 10.4) |
| 导出格式默认值 | 单选 PNG/JPG | ⚠️ Rust 支持 JPG 但 UI 只有 PNG | UI 补 JPG,加 JPEG 质量滑条 |
| 默认保存路径 + 免对话框 | 目录选择 + 开关 | ❌ 每次弹对话框 | 批量截图场景实用 |

#### P1 — 截图/标注效率(中等工作量)

| 设置项 | 类型 | 说明 |
|--------|------|------|
| 截屏十字线 | 开关 | 框选时跟随鼠标的十字辅助线 |
| 放大镜(带 RGB 取色) | 开关 | 精确框选字段边框,医疗截图场景常用 |
| 框选后默认动作 | 单选:进编辑器/直接复制/直接保存 | 当前硬编码「进编辑器」 |
| 编辑器默认工具 | 单选:smart/rect/arrow/text | 当前硬编码 smart |
| 文件命名规则 | 模板:时间戳/序号/自定义前缀 | 当前写死 `stepmark-{时间戳}` |

#### P2 — 暂不做(成本高或超范围)

- 捕捉鼠标光标、多显示器选择(xcap 底层支持,但属功能扩展非设置)。
- 便携版、DPI 感知、日志面板(Snipaste 高级类,非 MVP 必需)。

### 10.4 快捷键自定义(已实施)

已落地。AGENTS.md「不可变决策」的触发快捷键已同步更新为:**默认 F1,用户可在托盘「设置 → 快捷键」中改为任意全局快捷键**。

已实现内容:

- 托盘「设置 → 快捷键」打开独立的快捷键设置窗口,录入组合键(修饰键 + 主键)。
- 快捷键持久化在 Rust 端 `settings.json`(不放前端 localStorage,因为 Tauri 在 Windows 上各 webview 窗口的 localStorage 互相隔离,跨窗口不可靠)。
- 启动时由 Rust `setup` 读取并注册持久化的键(默认 F1),不依赖隐藏 main WebView 的加载时机;初始注册和改键仍统一传字符串,避免 id 错位导致旧快捷键残留。启动时若旧进程短暂占用按键会自动重试。
- 改键走 `set_screenshot_shortcut`:`unregister(旧键)` → `register(新键)` → 写盘 → emit `shortcut-changed` 通知其它窗口刷新镜像。
- 托盘菜单「截图 (...)」文字随当前快捷键实时更新。

实现踩坑(已修复,记录于此避免重蹈):

- **旧快捷键改键后仍可用**:根因是启动曾用 `Shortcut::new(None, Code::F1)` 对象注册、改键用字符串注册,两条路径标识不一致。修法:Rust 启动注册和改键都统一使用字符串路径。
- **多窗口快捷键不一致 / 重启丢失**:根因是前端 localStorage 在 Windows 上按 webview 窗口分区隔离。修法:持久化搬到 Rust 端 `settings.json`。

### 10.5 持久化层约定

设置项按「是否需要跨窗口共享」分两类持久化:

- **应用级偏好(需跨窗口共享)** → **Rust 端 `settings.json`**(`%APPDATA%\com.stepmark.app\settings.json`,由 `src-tauri/src/settings.rs` 读写)。原因:Tauri 在 Windows 上各 webview 窗口的 localStorage **互相隔离**,main 窗口读不到 shortcut-settings 窗口写的值,重启还可能丢失。已落地的快捷键(`screenshotShortcut`)就走这条。后续新增的应用级偏好(默认导出格式、JPEG 质量、默认保存路径、免对话框开关、框选后动作、默认工具、命名规则模板)都应加进这个 `Settings` struct。
- **单窗口工具样式** → 保留各自 localStorage key(`stepmark.toolStyles.v1`、`stepmark.numbering.v1`)。这些只在编辑器窗口读写,不存在跨窗口问题,不强行迁移避免风险。`editorStore` 仍不持久化(每次截图会话重置)。
- 首启向导的 `stepmark.firstRunDone` 标记保留 localStorage(main 窗口独占,无跨窗口需求)。

约定:

- `settings.json` 的 `Settings` struct 用 `serde`,`#[serde(default)]` 保证字段缺失/损坏时安全回退默认值,不崩溃。
- 前端只通过 `get_screenshot_shortcut` / `set_screenshot_shortcut` 等 invoke 间接读写,**不直接碰 localStorage 也不直接碰 Rust 文件**;前端 `settingsStore` 降为内存镜像,窗口挂载时从 Rust 读真值刷新。

### 10.6 入口与交互草案

托盘右键菜单当前 3 项(截图 F1 / 显示主窗口 / 退出)。拟调整为:

```text
托盘右键
  ├─ 截图 (F1)
  ├─ 设置 ▶          ← 新增,展开子菜单或弹轻量面板
  │    ├─ 开机自启        (勾选/取消)
  │    ├─ 截图快捷键      (点击后捕获新组合)
  │    ├─ 默认格式        (PNG / JPG)
  │    ├─ 默认保存路径    (打开目录选择)
  │    └─ ...其余 P0/P1 项
  ├─ 显示主窗口
  └─ 退出
```

- 优先用 Tauri 原生 `Submenu` 实现子菜单(checkbox/radio 类型菜单项),避免新增窗口。
- 放不下或交互复杂的项(命名规则模板、JPEG 质量)可退一步用主窗口里渲染一个极简设置页(主窗口当前是隐藏窗口,本就可承载),但**不新建独立 settings 窗口**。

### 10.7 验收标准(实施时用)

- 托盘右键能看到「设置」入口,且所有 P0 项可在此修改并立即生效。
- 开机自启状态在任意时刻可查可改,不再受首启向导限制。
- 改快捷键后,旧 F1 注销、新组合立即生效;重启应用后新快捷键保留。
- 所有偏好重启后保留;字段缺失/损坏时安全回退默认值,不崩溃。
- 导出格式选 JPG 时,JPEG 质量生效;选 PNG 时不受影响。
- 默认保存路径 + 免对话框开启时,保存不再弹框,文件落到指定目录。

