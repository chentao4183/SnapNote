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
| 触发快捷键 | 默认 F1,用户可在托盘「设置 → 快捷键」中改为任意全局快捷键;持久化在 Rust 端 `settings.json`(不放 localStorage,因 Tauri 在 Windows 上各 webview 窗口的 localStorage 互相隔离) |
| 流程 | 按快捷键框选 → 直接进编辑器 → 批注 → 复制/保存 |
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
- 在 Git-bash/MSYS 下用 `cmd /c` 执行 `.cmd` 脚本时,裸 `/c` 会被 MSYS 路径转换当成路径,导致 `cmd` 只打印 Windows 横幅、不执行命令(表现为输出空或只有 `Microsoft Windows [...]`)。必须写成 `cmd //c`(双斜杠)或用绝对路径 `C:\Windows\System32\cmd.exe //c "scripts\xxx.cmd"`。这和上一条 `find`/`timeout` 是同一类 MSYS 陷阱。
- **Tauri/Cargo release 增量缓存损坏**:某次 `tauri build` 报错 `failed to read plugin permissions: ... stream did not contain valid UTF-8`(文件是 `target/release/build/tauri-*/out/tauri-core-*-permission-files`),根因是该中间文件被写成了 Rust panic backtrace(可能因之前某次构建被打断/异常退出污染)。同类症状还包括 `crate 'debug_unreachable' required to be available in rlib format, but was not found`且 `target/release/deps` 里只剩 `.d`、没有对应 `.rlib`。cargo 增量看不到这种损坏,不会自动恢复。修复:只删 `target/release/build/tauri-*/`(build script 输出)不够 —— 会连带导致 `can't find crate for tauri_utils` 之类的依赖链接丢失。最稳是 `cd src-tauri && cargo clean` 全量重编(约 4 分钟),或用 `target` 子目录清理工具。判断依据:od/hexdump 那个报错文件,若内容是 `/rustc/...`、`std::sync::once_lock::OnceLock` 之类的 backtrace 符号而非 capability 路径列表,就是这类污染。
- **Tauri 跨窗口命令权限看调用方**:从 `selector/editor` 持有 `pin-*` 的 `WebviewWindow` 句柄并调用 `setSize` / `setPosition` 时,权限校验针对发起 IPC 的 `selector/editor`,不是目标 `pin-*`;相关权限必须同时写进调用方的 `default.json`,只写在 `pin.json` 会导致贴图创建卡在显示前。
- **关键启动逻辑不要依赖隐藏 WebView**:全局快捷键等应用级初始化必须在 Rust `setup` 完成,不能放在默认隐藏窗口的 React `useEffect`;Windows WebView2 冷启动时隐藏页面可能未及时执行,且前端 `console.warn` 对用户不可见。快捷键初始注册和改键必须继续统一使用字符串路径。
- **Git loose object 被错误信息片段污染(同类污染,不同落点)**:症状是 `git fsck --full` 报 `error: inflate: data stream error (incorrect header check)` + `loose object <hash> ... is corrupt`,进而 `git worktree add` / `git gc` / `git cat-file` 全部 fatal,但 `git log` / `git status` / 工作区文件看起来正常。根因:`.git/objects/XX/YYY...` 这个 loose object 文件的字节被覆写成了别的内容(本次案例是被一段意大利语程序错误信息 `e_0_was_found_on_type_1_7054`: `Non è stata tro...` 覆盖,疑似磁盘满/杀软拦截/进程崩溃时 git 写入被打断),和上一条 Tauri 中间文件污染是同一类「文件内容被错误 backtrace/错误信息覆盖」,只是发生在 git 对象库里。诊断:`od -A x -t x1z .git/objects/XX/YYY | head -3` 看头几个字节,正常 zlib stream 应以 `78` 开头,若是可读文本/错误信息片段就是被污染了。修复(零损失,前提是该对象对应的工作区文件还在且完好):(1) `git hash-object <file>` 算出 hash 确认和损坏对象 hash 一致;(2) `chmod +w .git/objects/XX/YYY`(对象文件默认只读);(3) `rm .git/objects/XX/YYY`; (4) `git hash-object -w <file>` 重写。重写后 hash 不变、所有引用该对象的提交/树依然有效、历史零改动。注意:`git gc --prune=now` 不能修复(repack 时读损坏对象会 fatal 中断);`git hash-object -w` 单独跑也不够(git 见同名对象"已存在"会跳过),必须先删污染文件再重写。
- **Git 对象库大规模损坏 + 工作树文件被同源污染**:上一条修法只适用于「少量对象损坏 + 工作区文件还在」的零损失场景。若损坏规模大(`git fsck --full` 报几十个 `object corrupt or missing`,且分两类:0 字节空文件 + `incorrect header check` zlib header 损坏),且损坏对象**包含 HEAD 链路上的 blob**(`git diff` / `git status` 里某个 `modified` 文件一 `git diff` 就 `fatal: unable to read <hash>`,或 `git ls-tree -r HEAD` 列出的 blob 正是损坏对象),就说明同一次磁盘异常同时污染了 `.git/objects` 和工作树文件(本次案例:`Cargo.toml` 被写成 cargo 的 `stepmark_lib.d` 依赖 makefile 片段、`useSmartAnnotationTool.ts` / `useTextTool.ts` 被清成 0 字节空文件,git status 报 modified 但实际是文件被破坏)。此时工作区文件已不可用作还原来源,上一条的单点修复法不适用。诊断要点:`git rev-list --objects --all` 能跑通不代表对象库健康(它只列 hash 不解内容,遇到损坏 tree 会静默中断遍历导致可达集不完整),必须用 `git diff <某文件>` 实测能否读 HEAD blob 才能确认工作是否被影响;区分「真损坏」(`: object corrupt or missing` 行)和「dangling 完好对象」(`^dangling` 行,正常现象),只对前者处理。最稳修复:**从 origin 重新 clone 一份干净仓库,只替换主目录的 `.git`(保留 `node_modules/` 和 `src-tauri/target/`,省去重装重编),再抢救本地领先 commit**(见下条)。比逐个 `hash-object` 重建可靠,尤其当损坏对象含 tree 时(tree 无法从工作树直接重建)。
- **抢救本地领先 commit + 替换 .git 的完整流程**(承接上一条):当决定走「clone origin → 换 .git」时:(1) 先 `git format-patch -1 <领先commit> --stdout > xxx.patch` 把未 push 的 commit 抢救成 patch(前提是该 commit 对象本身完好,即 `git cat-file -t <hash>` 不报错;若 commit 对象本身也坏了,只能从 reflog/`git fsck --lost-found` 找回);(2) clone 到一个**临时目录**(`D:/StepMark-fresh`),`git fsck --full` 验证新仓库零 error;(3) 在新仓库 `git am xxx.patch` 应用,得到等价 commit(注意:`git am` 会因 committer 日期变化生成**新 hash**,内容/作者/作者日期不变,若别处有原 hash 引用需另行 cherry-pick);(4) 把 patch 备份到**主目录之外**(`D:/_gitrescue_outside/`)防止目录改名时丢失;(5) 替换 .git:`mv StepMark/.git StepMark/.git.broken` + `cp -r StepMark-fresh/.git StepMark/.git`(留 `.git.broken` 兜底几天再删);(6) `git checkout HEAD -- <被污染的工作树文件>` 还原 + `git add --renormalize .` 消除 CRLF/LF 假 modified(新 .git 的 autocrlf 配置可能和旧工作树行尾不一致,会冒出一批「忽略空白后零差异」的假 modified,renormalize 一次性解决)。全程**不要删 `node_modules/` 和 `src-tauri/target/`**,那是几十分钟到几小时的重建成本。
- **harness/会话 cwd 锁定导致无法重命名工作目录**:本工具每次 Bash 调用前会把 shell 的 cwd **强制重置到 primary working directory**(本仓库是 `D:\StepMark`),即使命令里 `cd /d` 也会被重置回来。后果:任何想 `mv D:/StepMark D:/StepMark-broken` 或 `cmd //c "ren StepMark StepMark-broken"` 的操作都会报 `Device or resource busy` / `另一个程序正在使用此文件`,因为 shell 进程自己占着这个目录作为 cwd。这排除了「clone 到临时目录后重命名切换」的标准做法。绕法:**只换 `.git` 不重命名目录**(见上条 `mv .git → .git.broken` + `cp -r 新.git → .git`),子目录的移动/重命名不受顶层 cwd 锁定影响。同理,正在运行的 `stepmark.exe`(从 `src-tauri/target/release/` 启动)也会锁文件,目录级操作前必须先 `taskkill //F //IM stepmark.exe`。
- **删除 Windows 保留名文件(`nul`/`con`/`aux`/`prn`/`com1` 等)的转义陷阱**:某次 shell 重定向 `> nul` 想丢弃输出,MSYS/Git Bash 在 Windows 上把 `nul` 当成了真实文件名而非设备名,在工作目录留下一个名为 `nul` 的垃圾文件。删除它的障碍有三层:(1) Windows 保留名,普通 `rm`/`del` 会把它当设备拒绝;(2) 必须用 `\\?\` device-path 前缀(`[System.IO.File]::Delete("\\?\D:\path\nul")`)绕过 Win32 名称规范化;(3) **`\\?\` 前缀里的反斜杠无法通过命令行从 Git Bash 传给 PowerShell/cmd**——会被 printf 转义(`\\`→`\`)、MSYS 路径转换、shell 引号处理连环吞掉(实测传到 PowerShell 时变成 `\?\D` 且 `\n` 被解释成换行)。正确做法:**用 Write 工具直接写一个 `.ps1` 文件**(内容含字面量 `\\?\D:\path\nul`),再 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File xxx.ps1` 执行,彻底绕开 shell 转义。和 `cmd //c`、`find`/`timeout` 是同一类 MSYS 转义坑,但解法不是加斜杠而是改用文件传参。
- **NTFS 文件系统损坏是 git/源码/node_modules 反复异常的根因**:当遇到「源码文件内容随机变二进制(被 INDX 记录、0x00 填充、其他文件片段覆写)」「`git checkout`/`git hash-object` 退出码 0 但工作树内容没变」「`git status` 反复跳动」「`rm`/`rmdir` 报 Directory not empty 但 `ls` 显示空目录」「node_modules 装完文件却丢失」这类**没有单一原因、反复发作、不符合常理**的异常时,根因往往是 **D 盘(或对应盘)NTFS 文件系统逻辑损坏**,而非 git/node/具体文件的问题。诊断三件套:(1) `fsutil dirty query D:` —— 报「已损坏」= dirty bit 已设;(2) `Get-Volume D`(PowerShell)—— `HealthStatus: Warning, OperationalStatus: Scan Needed`;(3) `chkdsk` 产生的 `found.000`+ 目录数量递增(历史损坏+修复痕迹)。**修复:重启让 Windows autochk 自动跑,或 `chkdsk D: /F` 计划到重启**。修完后 dirty bit 清除、文件内容自动恢复、目录可正常删除。**重要:NTFS 修好后,git 对象库里在损坏期间写入的污染对象不会自动恢复**(它们是真实字节损坏,不是元数据错位),需手动清理(见上几条);同样 `src-tauri/target/` 缓存若在损坏期间生成,需 `cargo clean` 全量重编,否则报 `rlib: Unsupported archive identifier` / `os error 1006`。
- **任何会话里踩到的一次性环境坑,解决后必须立即回写进本文件对应小节**(像上面这几条一样),而不是只在当前会话记住。新会话默认不继承对话记忆,只有写进 `AGENTS.md` 的规则才会在每次开局被读到,从而避免"每次都报同一个错"。

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

## 分支与工作流（硬性规则）

**任何涉及代码修改的功能或优化，都必须先建功能分支，禁止直接在 master 工作树上堆改动。** 这是所有 AI Agent（Codex / Copilot / ZCode 等）新开会话时的第一条流程规则。

### 为什么用 worktree：一个仓库只有一份工作树

一个本地 git 仓库（`.git`）只有一份工作树和 HEAD 在磁盘上。**多个会话/终端在同一个目录（`D:\StepMark`）共用工作树时，任何一个会话的 `git checkout` 都会改写磁盘文件，污染其它会话的代码和编译产物**——这是典型踩坑：A 会话编译时，B 会话一个 checkout 就把 A 的改动覆盖了，A 还以为编译的是自己的代码。

git worktree 给每个会话一份独立的工作树（独立目录 + 独立 HEAD），多会话各在自己的目录里 checkout/编译/合并，互不干扰。因此：**多会话并行时必须用 worktree，禁止在主目录共用 checkout。**

### 流程（按顺序执行）

0. **判定用不用 worktree**（建分支前先做）：`git worktree list` 查看现有 worktree，`git -C D:\StepMark branch --show-current` 看主目录挂在哪个分支。
   - 若主目录 `D:\StepMark` **已被另一个会话占用**（挂在非 master 分支，或正在改/编译）→ **当前会话必须用 worktree**：`git worktree add ../StepMark-<功能名> -b <type>/<功能名>`，然后 `cd ../StepMark-<功能名>`，后续所有步骤在该目录内执行。
   - 若主目录**空闲**（挂在 master 且 clean）→ 单会话可在主目录直接 checkout 分支，不强制 worktree（向后兼容）。
   
   下面的步骤里，凡标「worktree」的，仅 worktree 会话按括号说明执行；标「主目录」的，仅单会话按括号说明执行；未标注的步骤两种场景通用。

1. **拉功能分支并进入**：分支名用英文、能体现功能（新功能 `feat/`，修复 `fix/`，重构 `refactor/`，文档 `docs/`）。
   - 主目录：`git checkout master && git status`（必须 clean，**禁止在脏工作树上拉分支**）→ `git checkout -b <type>/<功能名>`。
   - worktree：上一步 `git worktree add` 时已用 `-b` 建好分支并进入目录，无需再 checkout master；`git status` 确认 clean 即可。
2. **小步提交**：改一次 commit 一次，一个 commit 只表达一件事。不要等全部做完才一次性提交。提交信息用英文，遵循 `type(scope): summary` 格式（如 `feat(smart): ...`、`refactor(numbering): ...`）。
3. **自测验证**：在当前分支/worktree 目录上跑 `npm test` 和 `npm run build`，确认通过。涉及 Konva/React 渲染的改动还要做手动 smoke test。**编译产物（exe）前后各执行一次 `git branch --show-current` 并核对关键文件内容**，确认编译的就是本次改动，防止多会话竞态把代码切走。
4. **等用户确认后再合并**：把分支名、改动摘要、待验证点告诉用户。**只有用户明确表示验证通过，才执行合并**。禁止自测通过就自行合并。涉及渲染的改动以用户的手动 smoke test 为准。
5. **合并回主线**：在**主目录**执行 `git checkout master && git merge <type>/<功能名>`（worktree 会话先 `cd D:\StepMark` 回主目录；worktree 挂着 feature 分支，不能就地 checkout master）。除非用户明确要求合到其它分线，否则一律合回 master。
6. **清理**：若用了 worktree，**先 `git worktree remove ../StepMark-<功能名>` 删独立目录，再 `git branch -d <type>/<功能名>` 删分支**。注意顺序：`git merge` 不会自动删 worktree 文件夹；worktree 未 remove 时该分支被它占用，`git branch -d` 会失败——所以必须先 remove worktree、再删分支。单会话（无 worktree）直接 `git branch -d` 即可。

**例外**：纯只读的探查（看代码、查问题、回答问题）不需要建分支。一旦动手改文件，就按上面的流程走。

**为什么有这条规则**：多个 agent / 多次会话如果在同一条 master 工作树上叠加不同功能的改动，提交时就必须按 hunk 拆分文件，极易出错且难以隔离验证。功能分支（多会话下用 worktree）让每个改动天然隔离，提交即 `git add -A && git commit`，验证时整条分支独立可测，合并后最终代码与直推 master 完全一致。

---

## 编码与提交约定

- 代码注释和提交信息用英文。
- 用户面向 UI 文案用中文。
- 纯逻辑模块优先补单测。
- 涉及 Konva/React 渲染时,自动检查之外还要做手动 smoke test。
- 不提交 `node_modules/`、`src-tauri/target/`、`.superpowers/`。
- 不要把历史阶段叙事重新写回 README 或 `docs/PROJECT.md`。

---

## 经验分层规则

开发中积累的经验,**不是只能写进 AGENTS.md**。先按下面的标准判断属于哪一类,再决定落点,避免把 AGENTS.md 堆成杂物堆、稀释真正的硬规则。

| 类别 | 判定标准 | 落点 |
|------|----------|------|
| **规则 / 约束 / 环境坑** | agent 每次动手前**必须照做**,违背就报错或踩坑(如 `cmd //c`、`find`/`timeout`、先建分支、不提交 `target/`) | **AGENTS.md** 对应小节 |
| **叙述性知识 / 设计决策 / 模式** | 参考性,不是"必须照做"(如某模块为什么这样分层、MSYS 完整避坑大全、某种布局算法的设计思路) | **`docs/` 文档**(`docs/PROJECT.md` 或按主题拆分) |

操作准则:

- **默认先落 AGENTS.md**:新踩到的坑、新立的规矩,先按"上次踩坑回写"那条规则写进 AGENTS.md 对应小节,确保下次开局就读到。
- **AGENTS.md 只留指针,不堆细节**:当某主题在 AGENTS.md 里超过约 5 条、开始臃肿时,把详细版迁到 `docs/` 下专门文档,AGENTS.md 只保留一行指针 + 最关键的 1-2 条。不要在 AGENTS.md 里写长篇背景。
- **不主动制造碎片文档**:除非确有 5-6 条同主题经验聚集,否则不要新建 docs 文件;沿用本文件「不要重新创建同类碎片文档」的约定。
- **判断一句话**:这条经验是"每次必须照做的规则"吗?是 → AGENTS.md;否但将来有用 → docs。

---

## 当前环境

- 平台: Windows 10 19045 x64
- Shell: PowerShell
- 工作目录: `D:\StepMark`
- 独立 git 项目,非子模块
