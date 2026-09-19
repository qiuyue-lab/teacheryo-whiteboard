# AGENTS.md — 项目改动手册

> 这份文件是给**要动手改这个项目的 AI 助手**看的（Claude Code / Cursor / Codex / WorkBuddy 都适用）。
> 只是想把项目跑起来用 → 看 [`README.md`](README.md)；
> 想让 AI 帮你上手使用 → 看 [`AI-PROMPT.md`](AI-PROMPT.md)；
> **要改代码** → 就是本文件，请先完整读完再动手。

---

## 一句话定位

**零构建、可自托管的课堂互动工具。** 纯 HTML / CSS / 原生 JS，无 npm、无打包步骤、
无框架；数据层双模式（浏览器 localStorage ↔ Cloudflare Worker API + D1）。

技术栈就这么简单，所以**任何"现代化改造"（给前端引入构建工具、框架、npm 依赖）都视为破坏**。
唯一的例外：`server/` 目录（数据 API Worker）允许用 npm / TypeScript / Drizzle——
那是部署工具链，不属于前端页面；**前端仍然双击 `index.html` 就能跑**。

---

## 硬约束（违反后会静默坏掉，不会有报错）

### 1. 零构建不可破坏

前端（`index.html` / `student.html` / `js/` / `css/`）不引入 npm / webpack / vite /
TypeScript / 任何构建工具或运行时依赖。必须始终保持**双击 `index.html` 就能跑**。
构建工具只允许出现在 `server/`（数据 API Worker）里。

### 2. 数据层是双模式的 —— 加接口必须两边都加

`js/db.js` 启动时探测 `config.js` 的 `api` 字段：

```
api 留空  →  挂 window.TY_LOCAL（js/store.local.js，localStorage）
api 有值  →  挂 window.TY_API（js/store.api.js，fetch 到 teacheryo-api Worker + D1）
```

两套实现**必须同签名**，返回字段统一 snake_case
（`course_id` / `created_at` / `liked_by` / `part_idx`）。
**只改一边 → 本地模式会静默失效**（不报错，功能直接没有）。

数据 API Worker（`server/`，Cloudflare D1）三张表与接口语义：
- 表：`courses` / `boards` / `submissions`（`server/src/schema.ts`，JSON 列用 TEXT 存 JSON）
- uid：浏览器 localStorage（`ty.api.uid`）生成，每次请求经 `x-ty-uid` 头带上；
  `toggleLike` 在 Worker 里用**原子 SQL**（条件 UPDATE + json 函数），
  不要改回「读-改-写」（并发点赞会丢计数）
- CORS：`server/wrangler.jsonc` 的 `ALLOWED_ORIGINS` 白名单（逗号分隔），
  新增部署域名必须加进去，否则浏览器端表现为 `TypeError: Failed to fetch`

现有接口：`listCourses` `getCourse` `createCourse` `updateCourse` `deleteCourse`
`listBoards` `getBoard` `getBoardByCode` `createBoard` `updateBoard` `deleteBoard`
`moveBoard` `archiveBoard` `reopenBoard`
`listSubmissions` `submit` `toggleLike` `removeSubmission` `updateSubmission`

### 3. 便签墙用世界坐标，不要退回归一化

便签位置存 `data.px` / `data.py`（世界像素，**可为负**），画布 24000×24000，
`NC_ORIGIN = 12000` 为原点偏移。旧数据 `data.x/y`（归一化 0-1）渲染时自动换算，
一拖动即升级为新格式。

**不要引入任何「归一化 + 固定画布」的写法** —— 那正是当初"假无限白板"（缩小后框外贴不进去）的根因。

### 4. 会被周期性调用的恢复逻辑必须幂等

页面每 2.5 秒轮询重绘一次。像 `toggleNoteFull` 这种"重绘后恢复 UI 状态"的函数
**只会被反复调用**，因此只能同步 UI，**绝不能重复做尺寸换算 + 重定位**——
否则每轮固定偏移，表现为画面持续漂移。

判定口诀：**如果画面自己在动，先问是不是周期任务在重复一次不该重复的转换。**
（历史上"白板一直往右下角弹"就是这么来的。）

### 5. `TY.noteUiBusy()` 是轮询的刹车

白板内拖拽、缩放、老师面板打开、输入框聚焦时，它必须返回 `true`，
否则 2.5s 轮询重绘会**清空老师正在写的内容**。新增任何输入 UI 都要接进这个判断。

⚠️ **学生端目前没有接这个刹车**，而是靠"输入区根本没被轮询重建"侥幸安全：
`refreshBoard()` 里重调 `bindInput()` 的分支**只对 `material` 类型生效**，
`notes` 类型的输入区从头到尾没被重绘过。
所以学生端图片状态刻意存在 **`S.imgData`（JS 对象）而不是 DOM 里**，
并用**幂等**的 `S.setImgPreview()` 回填 ——
**如果哪天给 `notes` 也加上轮询重绘，必须保留这个"状态在对象上 + 幂等回填"的结构**，
否则学生正在选的图片会在 3 秒后凭空消失，而且不报任何错。
（详细复盘见 skill 的 `references/pitfalls.md` 坑 20。）

### 6. 凭据永不进仓库

真实 `envId` / `accessKey` 只写 `config.local.js`（已在 `.gitignore`）。
公开的 `config.js` 永远保持空模板。

推代码前自查：

```bash
git grep --cached -I -e "<envId>" -e "<accessKey>"
```

### 7. 脚本加载顺序不能调换

`vendor/cloudbase.full.js` → `config.js` → `config.local.js`
→ `js/store.local.js` → `js/common.js` → `js/db.js`

### 8. 随机点名：抽中的人 / 分组结果只能存在 `App.rc` 上

**任何"当场算出来的结果"都必须先落到 JS 状态对象，再由渲染函数从状态重画。**

`App.rc` = `{ bid, picked, current, rolling, groups, groupMode, groupN, noRepeat }`。
`rcStageHTML()` / `rcGroupsHTML()` 每轮都从它**幂等重画**，绝不从上一轮 DOM 里抄。

为什么（这是本文件里最容易被忘记的一条）：
`renderBoardBody()` 每 2.5 秒被整块重建一次（`body.innerHTML = ...`），
**只写进 DOM 的东西一定会被冲掉**，而且不报任何错 —— 表现就是
「刚抽出来的人 3 秒后自己消失 / 分组结果闪一下就没了」，老师会以为是玄学。

两条配套刹车：

- `refreshBoard(silent)` 开头有 `if (silent && this.rc && this.rc.rolling) return;`
  —— **抽名动画（约 1.7s）期间让轮询直接跳过**，否则动画会被重绘打断。
- `rollCall()` 的动画 step 里判断 `el && el.isConnected`，舞台被换掉就**安静收工、不动状态**，
  不要抛错、也不要把 `rolling` 卡在 `true`（卡住会让轮询永远停摆）。

同理，学生端「填名字」输入区也**只在"报名状态真的翻转"时才 `bindInput()`**，
否则 3 秒轮询会清空学生正在打的名字（见约束 5 的学生端部分）。

### 9. 学生端「交没交」决定哪块 UI 长什么样 —— 轮询只能补，不能覆盖

学生端页面上有**两份看起来一样的东西**（结果区 + 作答区），所以"交没交"必须
同时管住两边，否则学生在手机上看到上下各一份选项，不知道该点哪（2026-09-17 用户反馈）。

- **选择题没交之前只留一份可点的选项**：`renderAllUnits()` 里
  `locked = (u.subType === 'choice') && !this.isSubmitted(i)` → 结果区换成 `S.lockHTML()`，
  卡片加 `.locked`（虚线、无底、隐藏计数）。提交后自动解锁并画出结果。
- **`S.editing`（改选）期间，轮询绝对不能重建输入区** —— 判据是
  `refreshBoard()` 里那句 `if (this.isSubmitted(0) && !this.editing)`。
  少了 `&& !this.editing`，学生正在重选的选择会被 3 秒轮询清掉。
  （同约束 4 的"画面自己在动"，只是换成"选项自己变回去"。）
- **提交后跳转**统一走 `S.jumpToResults(partIdx)`：`scrollIntoView` + `.flash` 高亮。
  它只在提交成功那一刻调用，**不要放进轮询**，否则学生会一直被拽着滚。
- 结果的「我选的那项」标记走 uid：`myRow(partIdx)` → `myPicked(partIdx)` →
  `renderChoice(..., { mySel })` 打 `.mine` + `你的选择` 徽章。
  老师端不传 `mySel`，所以大屏渲染与以前完全一致（common.js 的渲染器加了可选参数，
  不要改成必填）。
- 重新提交 = 先 `removeSubmission(myRow(0).id)` 再 `submit`，**不能只 submit**，
  否则同一题会记两票（票数会凭空多出来）。这一句**故意不加 `if (editing)` 守卫**：
  学生清了浏览器数据后本地「已提交」标记会丢，但库里的行还在，再交一次就会
  让同一个人在大屏上出现两次（实测过：`ty_subbed_*` 被清掉再交，加守卫时 2 行 / 共 6 人，
  去掉守卫后 1 行 / 共 5 人）。

### 10. 从表单读值必须读 `.value` / `.checked`，**不能 `!!getElementById(id)`**

```js
// ❌ 元素对象永远 truthy → multi 恒为 true
const multi = !!document.getElementById('cfg-multi');
// ✅
const multi = !!(document.getElementById('cfg-multi') || {}).checked;
```

这条是**真实事故**（2026-09-17 用户反馈「我没勾多选，结果里却写着（多选）」）：
`createBoard()` 里写成 `!!document.getElementById('cfg-multi')`，于是**只要建选择题就恒存
`config.multi = true`** —— 大屏每个选项都挂「（多选）」，学生端也放开了多选。
**不勾 = 单选**，这是产品约定。

- 同类写法在教师端多处出现（`v(id)` 取 `.value` 那套是对的，照着写）。
- **已建的老互动救不回来**（库里恒 true，分不清老师本来想不想多选），所以大屏加了
  「🔘 单选 / ☑️ 多选」按钮（`App.toggleMulti`）让老师一键改 —— **不要以为改了代码老数据就自动好了**。
- 顺带确认过：学生端 `pickFromBoard` 本来就分单选/多选（单选替换、多选 toggle），
  `vote-head` 文案与 `multi-hint` 也都按 `u.multi` 切换 —— **只有建互动那一处读错了**。
- 改 `config.multi` 只动 `boards.config`，**不动任何已提交的数据**；学生端 2.5~3s 轮询内自动跟上。

---

### 11. 「轮询会重绘」这件事只允许有「同步」的副作用，不许有延迟副作用

白板每 2.5~3s 把 `#board-body` 整个 innerHTML 换掉。所以**任何「先渲染、再等一会儿搬一下」的写法，
都会变成每 3 秒闪一次的动画** —— 因为中间那段时间会真的被画出来。

2026-09-17 真实事故（用户原话：「左上角这个位置，这个一键整理它一直在闪烁」）：

```js
// ❌ 全屏还原：先把整理条留在卡片里，80ms 后再搬进白板浮层
if (wasFull) setTimeout(() => TY.toggleNoteFull(viewport, true), 80);
```

逐帧测量（rAF 采样 7s）拿到的证据：

| 时刻 | 整理条位置 | 说明 |
|---|---|---|
| t=0 | `(12,10) w=626` | 浮层里的正确位置 |
| t=2528 | `(202,291) w=1036` | **轮询重绘后落回卡片里**（全屏时那个位置在浮层后面，看不见） |
| t=2600 | `(12,10) w=626` | 80ms 后才被搬回浮层 |

于是那个按钮每 2.5s 就在左上角「消失→出现」一次 = 闪烁。

**同一个坑的第二个受害者**：`renderNotes()` 里
```js
const _needsDefer = !viewport.clientWidth;   // renderNotes 永远在「还没插进文档」时被调用
if (_needsDefer) canvas.style.visibility = 'hidden';   // ← 于是每轮轮询都把画布藏一帧
```
`renderNotes` 是渲染完才由调用方 append 到页面上的，所以 `clientWidth` 恒为 0、
`_needsDefer` 恒为真 —— **白板内容每 2.5s 白一帧**。修法：位置本来就在 `TY._ncViews[key]` 里存着，
先同步把 `transform` 打上去（只有**首屏**才需要真的藏）。

**约定**：
- 需要搬动 DOM（挂载位置随状态变化）→ 在**同一个同步块里**搬完，别用 `setTimeout` / `requestAnimationFrame` 分期。
- 需要「等元素进 DOM 才能算」→ 状态存下来，**先把已知的那部分同步应用**，再在 rAF 里补算剩下的，不要靠 `visibility:hidden` 遮。
- 整理条（`.note-arrange`）的归位交给 `renderNotes` 的 `opts.arrangeBar` 处理（它知道 `wasFull`），
  **不要在 `renderBoardBody` 里自己 `insertBefore`** —— 那样就退回了「先卡片、后浮层」的两段式。

---

## 文件职责

| 文件 | 职责 | 改它的风险 |
|---|---|---|
| `index.html` | 老师端全部逻辑（课程、发起互动、大屏、下发弹窗、课程封面 `App.pickCover` / `App.clearCover`、互动拖动排序 `App.bindActDrag` / `App.startActDrag` / `App.reorderAct`、随机点名 `App.rc` / `buildRollCallPanel` / `rollCall` / `makeGroups` / `removeSignin`、选择题单选/多选切换 `App.toggleMulti`、便签整理 `App.arrangeNotes`） | 高，改前先读懂 `renderBoardBody` + 约束 8 / 11、`createBoard` 的表单读取 + 约束 10 |
| `student.html` | 学生端（输码进入、共享看板、提交、便签带图 `S.imgData` / `bindImgPicker` / `setImgPreview` / `compressImage`、点名报名 `S.renderSignGate` / `S.signIn`） | 中，动图片状态前先读约束 5 |
| `js/common.js` | 公共渲染器：无限画布、便签渲染、按点赞整理、各类型结果渲染、**点名名册 `rosterItems` / `signinName` / `renderRoster`** | **最高**，前后端共用；动 `renderNotes` 前必读约束 11 |
| `js/db.js` | 数据层入口：`api` 留空→本地模式，有值→挂 `TY_API`（fetch 到数据 Worker） | 高（见约束 2） |
| `js/store.local.js` | 本地模式实现（localStorage，含 `reorderBoards`） | 高（见约束 2） |
| `js/store.api.js` | 云端模式实现：fetch 到 teacheryo-api Worker，uid 存 `ty.api.uid`、`x-ty-uid` 头带上 | 高（见约束 2） |
| `server/` | 数据 API Worker（Drizzle + D1）：`src/schema.ts` 三张表、`src/index.ts` 21 个接口、`tests/` 功能+压测脚本 | 高（构建工具只在这里；改完跑 `npm run typecheck` + `tests/smoke.mjs`） |
| `css/style.css` | 全部样式（暖纸感 + 黑描边 + 橙点缀） | 低，但改完必须强刷 |
| `config.js` | 提交到仓库的空模板（`api: ''`） | 绝不要写真实值 |
| `cloudbase/` | 【历史遗留】旧 CloudBase 建表 SQL + RLS，仅存档参考，**不要再按它开发** | 只读 |

便签墙的关键内部机制（`TY._ncViews` 视图记忆、`TY._ncCenter` / `TY._ncSize`、
`NC_ORIGIN`、`findFreeSpot`、`arrangeLayout`、`NOTE_SHAPES` 四种形状）详见
`~/.workbuddy/skills/classroom-interactive-whiteboard/references/architecture.md`。

---

## 随机点名子系统（第 6 种互动类型）

**一句话：名册就是一堆普通的 `submissions` 行，没有新表、没有新接口。**

```
老师发起「随机点名」互动 (boards.type = 'rollcall')
  → 学生扫码 → 填名字提交 → submissions 里一条 type='signin' 行
                            （author = 名字、data.name = 名字、part_idx = 0）
  → 老师端大屏：common.js 的 renderRoster() 画出名册
  → App.buildRollCallPanel() 提供「🎲 随机点名」和「👥 分组」两个动作
  → 结果存在 App.rc，见约束 8
```

数据层**一行都没改**：点名只用到既有的
`listSubmissions` / `submit` / `removeSubmission` / `currentUid`，
所以本地模式和云端模式自动都是对的（这正是"复用 submissions"的价值，
绕开了约束 2「加接口必须两边都加」）。**不要为了点名去新建表或新加 `TY.db.*`。**

### 两个容易踩的坑

**① 名册按「名字」去重，不是按 uid。**
`rosterItems()` / `signinName()`（都在 `js/common.js`）是唯一口径。

本地模式里 `currentUid()` 存在 localStorage，**整台浏览器共用一个 uid** ——
用 uid 去重会把「一台电脑演示多个学生」合并成一个人，本地直接失效。
课堂上「名字」本来就是点名的身份，所以按名字去重；同名同学会被合并成一条。

**② 移除名册里的人，要删掉「这个名字的全部行」。**
`App.removeSignin(id)` 先按名字找出**所有** `type='signin'` 且同名 的行一起删，
不能只删被点的那一条：同名同学用两台设备报名过、或改过名留下旧行时，
只删一条会让这个名字**点掉又弹回来**（名册按名字去重，剩下那条会重新兜住它）。
这个 bug 是探针跑出来的，实测「7 条报名点掉一个名字，库里只少了 1 条」。
删完记得连带把 `rc.picked` / `rc.current` 里的同名清掉、`rc.groups = null`（名册变了分组作废）。

### 分组算法

`splitIntoK(names, k)`（`index.html` 顶部的纯函数）：

```
base = floor(n / k),  rem = n % k        // 前 rem 组多 1 人
```

**不要退回「按每组人数切块」**（`chunk(names, size)`）：
切块法在 7 人 / 每组 3 人时得到 `3 / 3 / 1`，会凭空出现 1 人组。
`splitIntoK` 保证任意情况下 max-min ≤ 1，且 `k` 会被收敛到 `1..n`（组数比人还多也不炸）。
「按每组人数」模式是**反推组数**：`k = ceil(n / 每组人数)`，所以每组人数是「大约」。

---

## 改动后怎么验证

**验证原则：不要凭推理说"改好了"。**

### 探针页 + headless Chrome（推荐，已跑通）

不要依赖后台常驻的 `python3 -m http.server` —— **在 AI 工具环境里它和任何
`nohup ... &` 起的进程都会被回收**（表现为 `curl` 返回 502 / Node `fetch ECONNREFUSED`），
上一轮排查点名功能时在这上面白等了十几分钟。

**可靠做法：不要服务器、不要任何 npm 依赖，一条命令跑完。**

1. **探针页**：把 `index.html` / `student.html` 原样拷出来，只做两处改动 ——
   剥掉 `config.local.js` 那一行（保持 `envId` 留空 = 本地模式），
   在 `</body>` 前注入自测脚本，结果写进 `window.__probeReport`。
   这样测的是**真代码**，不是仿写的副本。
2. **用 `file://` 打开**（配 `--allow-file-access-from-files`，localStorage 正常可用），
   **`file://` 下不需要 http 服务器**。
3. **Chrome 和驱动脚本必须在同一条命令里启动**（同一条 `Bash` 调用内
   `Chrome &` → 等端口 → `node driver.js` → `kill`），否则 Chrome 会被回收。
4. **必须带上这一串参数**，否则无头页的定时器被节流到几乎不跑，
   表现为"页面卡住、`Runtime.evaluate` 超时"：

   ```
   --headless=new --disable-gpu --no-sandbox --allow-file-access-from-files
   --disable-background-timer-throttling --disable-backgrounding-occluded-windows
   --disable-renderer-backgrounding --disable-ipc-flooding-protection
   --disable-hang-monitor --hide-scrollbars --window-size=1280,900
   --disable-features=Translate,BackForwardCache,CalculateNativeWinOcclusion,MediaRouter
   ```

   （`--dump-dom` 在 Chrome 152 的新无头模式下会**挂住不退**，别用它抓报告；
   用 CDP 的 `Runtime.evaluate` 轮询 `window.__probeReport`。）
5. **探针脚本里必须把 `window.confirm` / `window.prompt` / `window.alert` 全部打桩**：
   无头环境里 `navigator.clipboard` 会失败 → 代码回退到 `prompt()` →
   **原生对话框会把渲染线程永久卡死**，现象是 CDP 的 `Runtime.evaluate` 从此超时。
   （`App.exportText()` / `App.copyGroups()` / `App.copyCode()` 都走这条回退路径。）
   驱动侧再加一道保险：监听 `Page.javascriptDialogOpening` 后自动
   `Page.handleJavaScriptDialog({accept:false})`。
6. **探针调用 `S.enterBoard()` 之前，先等页面的 `load` 事件**：
   学生端 `boot()` 挂在 `DOMContentLoaded` 上（`S.boot()` → `renderHome()`），
   而页内联脚本里的 `await` 链是**微任务**、会先于 `DOMContentLoaded` 跑完 ——
   直接调 `enterBoard()` 会被随后的 `renderHome()` 覆盖，
   现象是"明明进了互动，页面还是首页"。同理老师端要先等 `App` 就绪再 `App.go()`。
7. 断言里**至少要有两条"抗轮询"的**：
   `await App.refreshBoard(true)` 连做 3 次后抽中结果仍在、
   `await S.refreshBoard()` 连做 2 次后学生输入框里的名字还在。

### 其他约定

- **画布/交互类 bug**：写独立**探针页 + 假数据**直接驱动 `renderNotes()`，
  按真实时序模拟「缩放 → 全屏 → 每 N 秒重绘」，把 `TY._ncViews[key]` 的 `tx/ty/z`
  逐轮打日志比对。比登录点真实应用快得多，还能同页跑「修复前 / 修复后」两版对照。
- **样式类 bug**：在探针页里用**内联样式现场还原旧声明**搭对照组，
  比对测量数值（高度、`scrollWidth` vs `clientWidth`），避免"改了但其实没生效"。
- **改完 `css/style.css` 必须提醒用户强制刷新**（`⌘ + Shift + R`），缓存极顽固。
- **真起服务时**（要看视觉效果 / 人工点一遍），`python3 -m http.server 8921 --bind 127.0.0.1`
  要在**同一条命令里**起、用、关，别指望它能跨调用活着。
- **用 `agent-browser` 验证时，URL 必须带缓存参数**（如 `index.html?v=7#c=xxx`）：
  它默认命中磁盘缓存，改了文件但不带参数会读到旧页面，**会误判成"改了没生效"**。
- 同理，`agent-browser` 的 daemon 重启（命令被 SIGTERM 时）会**清空 localStorage**，
  表现为探针种子数据莫名消失 —— 先重新种一遍，别急着怀疑数据层。
- 拖拽 / 手势类改动用**真实鼠标事件**验证，不要只派发合成事件：
  ```bash
  agent-browser mouse move <x> <y> && agent-browser mouse down \
    && agent-browser mouse move <x> <y2> && agent-browser mouse up
  ```
  坐标用 `getBoundingClientRect()` 现场算；页面上有「删除」按钮时**别按估算坐标点**，
  否则会弹出删除确认框把后续命令全卡住（误触发过，用 `dialog dismiss` 收场）。
- **`agent-browser` 的 `click` 在元素不在视口里时是「静默成功」**（打印 `✓ Done` 但什么都没点）。
  **每次 click 前先 `agent-browser scrollintoview <sel>`**，否则会误判成"代码没生效"。
  （2026-09-17 在提交按钮上白踩两次。）
- **`agent-browser set viewport 390 844`** 可以把窗口切成手机尺寸 —— 学生端的问题
  几乎都是手机宽度才会暴露（本次的落点出画就是这样），别只在 1280 宽的窗口里验收。
  另外 `agent-browser errors` / `console` 能直接看页面报错，收尾时过一遍。
- **后台常驻的 http 服务在工具环境里也能活**（2026-09-17 实测）：用工具的
  **后台任务方式**启动（等价 `run_in_background`，会拿到一个 task_id），
  而不是 `nohup ... &` —— 后者随命令结束就被回收。本次整套验证都跑在这个服务上。
- **探针目录不需要重新拷贝**：把真实项目文件 **软链**进探针目录
  （`ln -s <项目>/student.html <探针>/student.html` 等，`python3 -m http.server` 会跟随软链），
  这样改完真实文件只要刷新页面就是新代码，不用反复同步副本。

---

## 部署

**当前主部署（2026-09-19 起）：Cloudflare Workers 两件套**：

1. **前端 Worker** `teacheryo-whiteboard`：`wrangler.jsonc`（根目录，assets-only Worker），
   `assets.directory = ./release`。部署前先组装 release：
   `mkdir release && cp index.html student.html config.js release/ && cp -r css js vendor release/`
   再把**填好 `api` 地址的 `config.js`** 覆盖进 `release/`（api 指 teacheryo-api Worker，
   **不进 git**）。然后 `cd release && npx wrangler deploy`。
   线上 `https://teacheryo-whiteboard.jshansince93.workers.dev/`
2. **数据 API Worker** `teacheryo-api`：`server/wrangler.jsonc`（D1 绑定 `teacheryo-db`，
   `ALLOWED_ORIGINS` 白名单）。`cd server && npx wrangler deploy`；
   建表/改表走 `npm run db:generate`（drizzle-kit）+ `npm run db:migrate:remote`。
   线上 `https://teacheryo-api.jshansince93.workers.dev`
   ⚠️ 新增**部署域名**（换前端托管地址）必须同步把新 Origin 加进
   `server/wrangler.jsonc` 的 `ALLOWED_ORIGINS` 并重新 deploy，否则浏览器端报
   `TypeError: Failed to fetch`（CORS 预检被拒）
3. **自动部署**：`.github/workflows/deploy.yml`（推 `main` 自动 wrangler deploy）。
   需要 GitHub Secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、
   `CONFIG_JS`（填好版 config.js 全文，用于云端模式；不配则发布本地模式）。
   workflow 会自己组装 release 并注入 config，**不要把填好的 config.js 提交进仓库**

**历史部署（CloudBase / GitHub Pages）**：

- **CloudBase 静态托管**：`manageHosting(upload)`，线上地址
  `https://teacheryo-d5g4wbd0sde42bcf6-1482570882.tcloudbaseapp.com`
  （凭据过期用本地 `tcb` CLI 兜底）——**2026-09-19 起数据层已迁走，此地址不再更新**
- **GitHub Pages**：推 `main` 分支即自动部署到
  `https://qiuyue-lab.github.io/teacheryo-whiteboard/`——它用的是仓库空模板
  `config.js`（本地模式），历史上也一直如此（从未加进 CloudBase 安全域名白名单）
- ⚠️ **绝对不要整目录上传**（这条踩过就会静默坏掉）：
  仓库里的 `config.js` 是**空模板**（`api: ''`），而**线上那份是填好的**
  （api 指向 teacheryo-api Worker）。
  整目录覆盖会把线上打回**本地模式**：学生扫码后各存各的浏览器、大屏永远看不到别人的提交，
  **而且不报错**，看起来一切正常。
  正确做法：**只上传真正改过的文件**（用 `manageHosting` 的 `files` 参数逐项指定），
  或先确认线上 `config.js` 的内容再决定覆盖范围。
  - 怎么判断线上是云端模式：打开站点看右上角是否有「云端同步」角标、能否列出真实课程
  - 怎么核对哪些文件真的旧了：`md5 -q <本地文件>` 与托管文件的 `ETag` 比对
    （线上单文件上传的 ETag 就是 MD5）。2026-09-17 这次就是这样查出只有
    `index.html` / `student.html` / `js/common.js` 三个文件需要传。
- ⚠️ **默认的 `*.tcloudbaseapp.com` 是腾讯云「测试域名」**：真实浏览器首次访问会先看到
  一页「风险提醒 · 页面访问提示」，要手动点「确定访问」才进应用。
  **命令行/脚本直接拉取不会看到这层拦截**（所以"用脚本验证线上内容"会漏掉它）。
  要彻底去掉只能绑定自有域名。上线给真实班级用之前，务必自己用浏览器点一遍确认。
  - 本次是用 agent-browser 真点了一遍：`find text "确定访问" click` 之后才进到应用，
    确认右上角是「云端同步」、能列出真实课程。
- ⚠️ **`git status` 说 `ahead 1`、但 push 输出 `Everything up-to-date` —— 先别慌，多半是锁没删掉**：
  跑在助手沙箱里时，`git` 在 `.git/` 下建/删锁文件会被拦（`Operation not permitted`），
  于是留下 `index.lock` 或 `refs/remotes/origin/main.lock`，下一次 git 命令直接报
  「an editor opened by 'git commit'」或者干脆不干活。**但远端往往已经收到提交了**。
  判断顺序：`git ls-remote origin main`（看远端真实哈希）→ 一致就 `ls-remote` 收工，
  不一致才需要动手；要动手就一条命令里清干净：
  `rm -f .git/index.lock .git/refs/remotes/origin/main.lock; git fetch origin`。

---

## 当前状态

- 已开源：`github.com/qiuyue-lab/teacheryo-whiteboard`（MIT，gh 账号 `qiuyue-lab`）
- 已内置 `.workbuddy/skills/visual-cognition-slides/`（MIT，来源 edu-ai-builders），
  作为项目的视觉设计语言参考
- **数据层已整体迁到 Cloudflare（2026-09-19）**：腾讯云 CloudBase 收费策略变化，
  数据层重建为 `server/`（Cloudflare Worker + Drizzle + D1，`teacheryo-db`）。
  前端从 `vendor/cloudbase.full.js` 切到原生 fetch（`js/store.api.js`），
  `js/db.js` 探测字段从 `envId` 改为 `api`，**前端页面渲染层零改动**。
  uid 改为浏览器生成（`ty.api.uid`），`toggleLike` 用原子 SQL（30 并发点赞一致性实测精确）。
  验证：功能冒烟 39 PASS（21 接口正反向 + CORS）、压测 30 学生×3 轮提交 P95 223ms
  + 30 并发点赞 likes 精确=30、无头 Chrome 探针老师端/学生端各 14 PASS（真实页面连真实 API）、
  线上探针 10 PASS。**旧 CloudBase 数据未迁移**（用户决定重建，旧数据在
  `teacheryo-d5g4wbd0sde42bcf6` 环境里，库结构见 `cloudbase/migrations/` 存档）。
- **便签带图两端都有**：老师端 `.note-dock-wrap`（`App.compressImage`，`w:230`），
  学生端 `S.bindImgPicker` / `S.compressImage`（`w:210`）。
  两端共用渲染：`common.js` 里 `data.img → .note-mini .note-img`，元数据统一是
  `submissions.data.img`（dataURL 字符串）。**只图无字也允许提交。**
  压缩参数：等比 720px 内 + `toDataURL('image/jpeg', 0.72)`，PNG 透明底先填白。
- **课程封面可自定义**：课程卡片 hover 出现「🖼 换封面 / ↩︎ 恢复默认」。
  封面图前端压到 1100px 内 + JPEG 0.78（比便签图宽，因为是横幅），
  存 `courses.cover`（dataURL 字符串，空串 = 用默认渐变 + emoji）。
  取图统一走单例隐藏 input `App.coverInput()`（课程卡片会被重绘，input 不能挂卡片里）。
- **互动顺序 = 拖动排序**（不是箭头按钮）：按住每行右侧的 `⠿` 手柄上下拖，
  松手按新顺序重写 `boards.step`（1..n）。
  实现细节：指针事件 + `setPointerCapture` + **6px 阈值**（防手抖误触）+ 拖动中整行
  `position:fixed` 跟手 + 按中点 `insertBefore` 实时重排；落库走
  `TY.db.reorderBoards(courseId, orderedIds)`（本地/云端同签名）。
  按下手柄不拖动时，handle 上的 click 会被 `stopPropagation` 吃掉，**不会误进互动**。
  ⚠️ **旧箭头按钮「显示已调整、实际没变」的根因**（2026-09-17 在线上数据里查到）：
  历史数据的 `boards.step` **大量并列**（线上「教育开放麦」是 `[1,1,1]`、「9.19杭州线下开放麦」是 `[1,1]`），
  而旧的 `moveBoard` 是「相邻两条互换 step」——两个 1 互换当然还是 1，界面却照旧乐观提示"已调整"。
  并列的成因是旧 `createBoard` 用 `条数 + 1` 算 step：`[1,2,3]` 删掉中间那条后剩 `[1,3]`，
  再新建就算出 3，与已有的 3 撞车。
  **两处都已修**：`createBoard` 改成 `max(step) + 1`（本地/云端两套），排序改成全量重写 `1..n`。
  历史脏数据用 `reorderBoards(该课程当前展示顺序)` 幂等刷一遍即可（不改变视觉顺序，只把 step 排整齐）。
- **随机点名（第 6 种互动类型）**：`boards.type = 'rollcall'`，学生扫码填名字 → 写一条
  `submissions.type='signin'`（复用 submissions，不新增表）；学生端报名页
  `S.renderSignGate`，老师端大屏名册 `renderRoster` + 点名/分组面板 `buildRollCallPanel`。
  抽中结果存 `App.rc`（约束 8），名册按名字去重，分组用 `splitIntoK`。
  **完整说明见上面「随机点名子系统」一节。**
  已验证：探针 41 PASS / 0 FAIL（老师端）+ 22 PASS / 0 FAIL（学生端），
  含「3 轮轮询后抽中结果仍在」「2 轮轮询后学生输入框内容还在」两条抗轮询断言。
- **学生端「作答动线」重做（2026-09-17，起因是用户在手机上看到「上面 4 个选项、下面 4 个选项，到底点哪」）**：
  1. **选择题没交之前不剧透结果**（约束 9）：结果区只在 `submissions` 里出现
     `👀 提交后就能看到大家的选择 · 已有 N 人作答`，页面上一份可点选项；
     提交后结果解锁、我的那项加橙框 + `你的选择` 徽章，并自动滚到结果区。
  2. **提交后跳转**：`S.jumpToResults(i)`（`scrollIntoView` + 闪一下）。
     便签墙 / 填空 / 词云也接了 —— 交完直接看到自己的东西落在哪。
  3. **「改一下我的选择」**：`S.editChoice()` 把投票卡带回原选项，
     重新提交前先删掉旧行（不然记两票）。`S.cancelEdit()` 放弃改选。
  4. **便签墙：输入区挪到白板前面**（`buildBoardHTML` 里按类型决定
     `iHtml + uHtml` 还是 `uHtml + iHtml`）—— 学生一进来就能落笔，
     不用先翻过一整块 540px 的白板去找输入框。白板标题也从「自由白板」改成「全班的便签墙」。
     注意：轮询不会重建 `notes` 的输入区，所以这次重排不影响约束 5 的图片状态那条。
  5. `student.html` 里补上了 `.unit-card` / `.unit-no` / `.unit-res` 的样式 ——
     这三个类名**学生端以前只有类名没有样式**（只在 `index.html` 的内联 style 里定义过），
     结果区一直是"裸"的。
- **便签落点会跑出视野**（`findFreeSpot` 的老毛病，顺手修了）：
  `findFreeSpot(rows, center, box)` 新增可选 `box`；学生端提交便签时传
  `{ w, h, nw, nh }`（可视区世界尺寸 + 这张便签尺寸），候选点就会被夹在可视区内。
  ⚠️ **陷阱：`data.px/py` 是便签的左上角**（渲染就是按左上角定位的），
  但搜索里的 `noteWorldPos()` 把它们当中心点比距离 —— 所以夹的范围是
  `[-半边, +半边 - 便签自身尺寸]`（`clampSpan`），**不能对称地夹**，
  否则便签会有一半挂在屏幕外（第一版就是这么写错的）。
  老师端便签坞不传 `box` → `hw/hh = Infinity` → 行为与改动前逐字节一致。
  实测（390×844 手机视口）：落点从「右半张出画」变成完全落在可视区内。
- **选择题「不勾多选却变成了多选」（2026-09-17 用户反馈，根因见约束 10）**：
  `createBoard()` 里 `!!document.getElementById('cfg-multi')` 恒为 true，所以**所有**选择题
  都被存成 `config.multi = true`。已修（读 `.checked`）。
  另在大屏动作区加了「🔘 单选 / ☑️ 多选」按钮（`App.toggleMulti` → `updateBoard({config})`），
  老互动不用删了重建。
  实测：不勾 → `multi:false`；勾了 → `multi:true`；大屏按钮点一下 →
  文案变「☑️ 多选」且结果条里立刻出现「（多选）」；学生端单选时
  `head = 「选一个你的答案」`、无 `multi-hint`、连点两项只留后点的那项（`choiceSel=[1]`）；
  多选互动回归正常（可勾两项、再点取消）。
- **已上线（2026-09-17，提交 `f66d47e`）**：推到 GitHub 后 Pages 自动构建完成
  （`qiuyue-lab.github.io/teacheryo-whiteboard/`，`status: built`）；CloudBase 静态托管用
  `manageHosting(upload, files=[...])` **只传了改过的 3 个文件**（`index.html` / `student.html` /
  `js/common.js`），线上 md5 与本地逐一相符，`config.js` 未被覆盖。
  线上实测：站点为「云端同步」模式、能列出真实课程（`0917数字分身工作坊` 等），
  学生端 `S.lockHTML` / `S.jumpToResults` 都在、无控制台报错。
  ⚠️ 线上**三个选择题目前都是 `multi: true`**（都是这个 bug 建出来的）：
  `0917数字分身工作坊/身份选择`、`教育开放麦/你觉得ai是人还是工具？`、
  `【AI通识课培训】/选择·你想做html还是应用？` —— 想改单选的老师点一下大屏上的「🔘 单选」即可
  （**没敢替老师改，原意不明**）。
- **便签墙整理条精简 + 「点了整理像没反应」+ 全屏下闪烁（2026-09-17 用户反馈）**：
  1. **六个按钮砍到只剩「👍 按点赞排序」**，并去掉左边那个 `一键整理` 标签。
     老师原话：「也不需要按照这么多的这种来去做排序…我们就直接有一个按点赞排序就可以了」。
     其余排布模式（`time` / `color` / `shape` / `anchor` / `scatter`）在
     `arrangeLayout` 里**保留着**，想加回来只需在 `index.html` 的整理条里补按钮。
  2. **整理结果不再跑出视野**：`arrangeLayout(mode, rows, anchors, center, box)` 新增
     `box`（当前视口的**世界尺寸**，来自新的 `viewport.__worldSize()` / `TY._ncSize[]`）。
     按点赞排序改成「按便签实际宽度定格子 → 选长宽比最接近可视区的列数 →
     整块网格以视口中心对称摆放」，排完 `__fitContent()` 兜底。
     实测 10 条便签 → 5×2 网格，x∈[287,1273] y∈[337,727]，**完全落在 1032×590 的可视区内**，
     缩放不用变（100%），点赞序 7/6/5/4/3 + 2/2/1/1/0 自左向右、自上而下。
     老写法按固定 1560×1080 基准区铺，网格比真实视口大 —— 排完便签一半在视野外，
     这就是「排了跟没排一样」的根因。
  3. **全屏下整理条每 2.5s 闪一次**（约束 11）：`renderNotes` 里
     `setTimeout(() => TY.toggleNoteFull(viewport, true), 80)` 被删掉，改为
     **同一同步块内**用新的 `opts.arrangeBar` 直接摆好（全屏 → 浮层，非全屏 → 卡片顶部）。
     顺带修掉「画布每轮 `visibility:hidden` 一帧」（同一条约束里那个 `_needsDefer`）。
     逐帧实测（rAF 采样 7s）：修前 9 次状态跳变（`(12,10)w=626` ⇄ `(202,291)w=1036`
     + `canvas:hidden`）；修后 **0 次跳变**。

**悬而未决**：

1. 仓库名仍是 `teacheryo-whiteboard`（项目名已改为「TeacherYO 课堂互动工具」，
   但仓库改名会让已分享链接失效，尚未决定）
2. 下发弹窗里的**课堂码**目前只做了精简（一行紧凑卡片），未彻底移除

---

## 协作提醒

- 用中文沟通；用户用 Mac + 微信
- 删除文件前先确认
- 报 bug 时让用户按「做了什么 / 期望什么 / 实际什么 / 哪个模式 / 复现概率 / 控制台报错」
  描述，比"不工作了"有效一个数量级
