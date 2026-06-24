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
