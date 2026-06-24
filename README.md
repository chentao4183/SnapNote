<div align="center">

# StepMark

**Windows 桌面截图批注工具 · V1.0**

面向日常问题反馈、医疗信息化需求评审和系统验收的轻量截图批注工具。核心能力是 **智能标注**：在截图上拖拽一次,一步生成「可选目标框 + 箭头 + 文字标签」组合,不用在矩形、箭头、文字工具之间反复切换。

</div>

---

![StepMark 智能标注效果](docs/images/hero.png)

## 功能

- **截图与编辑流程**：按 `F1` 框选屏幕区域,确认后直接进入编辑器。
- **智能标注**：拖拽后自动生成目标框、箭头和文字标签,目标框可选矩形、椭圆或无,适合快速指出界面问题。
- **基础标注工具**：矩形/椭圆、箭头、文字、马赛克。
- **编辑能力**：多标注并存,支持选中、移动、缩放、改字、删除、撤销/重做。
- **可调裁剪区**：进入编辑器后仍可调整截图裁剪范围,无需重新截图。
- **样式自定义**：每个工具独立配置线宽、颜色、形状、字体/字号等,配置会持久化,只影响新建标注。
- **自动编号**：智能标注默认自动编号,矩形/箭头/文字可按需开启;同一张截图内全局递增,删除不重排,导出时保留编号。
- **导出**：保存 PNG/JPG,或一键复制图片到剪贴板。
- **常驻后台**：系统托盘、全局热键、可选开机自启。

当前 V1.0 已完成以上能力。唯一保留的后续候选方向是 **AI 分析**：基于截图和标注识别 UI / 字段 / 流程问题。

## 使用

1. 启动 StepMark,程序常驻系统托盘。
2. 在任意应用中按 `F1`。
3. 拖拽框选需要截图的区域。

   ![框选截图区域](docs/images/flow-select.png)

4. 在编辑器里用智能标注或其他工具批注。

   ![智能标注生成目标框、箭头和文字标签](docs/images/flow-smart.png)

5. 复制到剪贴板,或保存为 PNG/JPG。

   ![复制到剪贴板或保存为 PNG/JPG](docs/images/flow-export.png)

### 工具栏

![工具栏与样式面板](docs/images/flow-toolbar.png)

| 工具 | 作用 |
|------|------|
| 智能标注 | 生成「可选目标框 + 箭头 + 文字标签」组合 |
| 矩形 | 绘制矩形或椭圆轮廓 |
| 箭头 | 绘制箭头 |
| 文字 | 添加文字标签 |
| 马赛克 | 局部打码 |
| 复制 | 复制当前截图到剪贴板 |
| 保存 | 导出 PNG / JPG |

点击智能标注、矩形、箭头、文字工具会展开二级样式面板,可调整样式和自动编号设置。

## 适用场景

| 场景 | 说明 |
|------|------|
| 日常问题反馈 | 产品、UI、实施验收中快速圈出问题点并发送 |
| 医疗信息化项目 | 需求评审、系统验收、缺陷反馈、截图归档 |
| 文档与教程 | 给操作步骤配带箭头和文字说明的截图 |

## 技术栈

| 层 | 选型 |
|----|------|
| 桌面框架 | Tauri 2.x |
| 前端 | React 19 + TypeScript + Vite |
| 画布 | Konva.js + react-konva |
| 状态管理 | Zustand |
| 持久化 | localStorage |
| 截图底层 | xcap |
| 系统能力 | Tauri 全局热键、剪贴板、Dialog、托盘、开机自启 |

## 开发

### 环境要求

- Windows 10 / 11 x64
- Node.js 18+
- Rust 1.75+
- WebView2 运行时

### 常用命令

```bash
npm install
npm run tauri dev
npm test
npm run build
npm run tauri build
```

打包产物位于 `src-tauri/target/release/bundle/`,裸 exe 位于 `src-tauri/target/release/stepmark.exe`。

## 项目结构

```text
src/
├── windows/        # Main / Selector / Editor 三个窗口
├── canvas/         # Konva Stage、图层和 Shape
├── tools/          # 各标注工具 hook
├── geometry/       # 纯几何算法和单测
├── numbering/      # 自动编号应用逻辑
├── store/          # Zustand store
├── ipc/            # Tauri invoke/listen 封装
├── types/          # Annotation / Tool / Style 类型
└── components/     # Toolbar / StylePanel / TextInputOverlay 等组件

src-tauri/src/
├── commands/       # screenshot / clipboard / save / autostart
├── tray.rs
└── main.rs
```

更多产品、架构和维护约定见 [docs/PROJECT.md](docs/PROJECT.md)。

## 许可与免责声明

本项目暂未指定开源许可证。在添加 LICENSE 文件之前,默认所有权利保留。

- 仅支持 Windows x64。
- 截图内容可能涉及隐私或敏感信息,用户自行承担使用风险。
- StepMark 对标 Snipaste 的交互理念,但为独立实现,与 Snipaste 无任何关联或从属关系。
