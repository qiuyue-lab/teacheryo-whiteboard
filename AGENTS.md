# AGENTS.md — 项目改动手册

> 这份文件是给**要动手改这个项目的 AI 助手**看的（Claude Code / Cursor / Codex / WorkBuddy 都适用）。
> 只是想把项目跑起来用 → 看 [`README.md`](README.md)；
> 想让 AI 帮你上手使用 → 看 [`AI-PROMPT.md`](AI-PROMPT.md)；
> **要改代码** → 就是本文件，请先完整读完再动手。

---

## 一句话定位

**零构建、可自托管的课堂互动工具。** 纯 HTML / CSS / 原生 JS，无 npm、无打包步骤、
无框架；数据层双模式（浏览器 localStorage ↔ 腾讯云 CloudBase PostgreSQL）。

技术栈就这么简单，所以**任何"现代化改造"（引入构建工具、框架、npm 依赖）都视为破坏**。

---

## 硬约束（违反后会静默坏掉，不会有报错）

### 1. 零构建不可破坏

不引入 npm / webpack / vite / TypeScript / 任何构建工具或运行时依赖。
必须始终保持**双击 `index.html` 就能跑**。

### 2. 数据层是双模式的 —— 加接口必须两边都加

`js/db.js` 启动时探测 `envId`：

```
envId 留空  →  挂 window.TY_LOCAL（js/store.local.js，localStorage）
envId 有值  →  CloudBase 实现（匿名登录 + app.rdb()）
```

两套实现**必须同签名**，返回字段统一 snake_case
（`course_id` / `created_at` / `liked_by` / `part_idx`）。
**只改一边 → 本地模式会静默失效**（不报错，功能直接没有）。

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

---

## 文件职责

| 文件 | 职责 | 改它的风险 |
|---|---|---|
| `index.html` | 老师端全部逻辑（课程、发起互动、大屏、下发弹窗、课程封面 `App.pickCover` / `App.clearCover`、互动拖动排序 `App.bindActDrag` / `App.startActDrag` / `App.reorderAct`） | 高，改前先读懂 `renderBoardBody` |
| `student.html` | 学生端（输码进入、共享看板、提交、便签带图 `S.imgData` / `bindImgPicker` / `setImgPreview` / `compressImage`） | 中，动图片状态前先读约束 5 |
| `js/common.js` | 公共渲染器：无限画布、便签渲染、一键整理、各类型结果渲染 | **最高**，前后端共用 |
| `js/db.js` | 数据层入口：环境探测 + 两模式共用工具（含拖动排序落库 `reorderBoards`） | 高（见约束 2） |
| `js/store.local.js` | 本地模式实现（localStorage，含 `reorderBoards`） | 高（见约束 2） |
| `css/style.css` | 全部样式（暖纸感 + 黑描边 + 橙点缀） | 低，但改完必须强刷 |
| `config.js` | 提交到仓库的空模板 | 绝不要写真实值 |
| `cloudbase/migrations/` | 建表 SQL + RLS 策略 | 改前确认权限模型 |

便签墙的关键内部机制（`TY._ncViews` 视图记忆、`NC_ORIGIN`、`findFreeSpot`、
`arrangeLayout` 六种整理模式、`NOTE_SHAPES` 四种形状）详见
`~/.workbuddy/skills/classroom-interactive-whiteboard/references/architecture.md`。

---

## 改动后怎么验证

**起本地服务**（`python3 -m http.server` 在工具环境里会被当子进程杀掉，
必须以后台方式常驻）：

```bash
cd <项目目录>
python3 -m http.server 8921 --bind 127.0.0.1
```

**验证原则：不要凭推理说"改好了"。**

- **画布/交互类 bug**：写独立**探针页 + 假数据**直接驱动 `renderNotes()`，
  按真实时序模拟「缩放 → 全屏 → 每 N 秒重绘」，把 `TY._ncViews[key]` 的 `tx/ty/z`
  逐轮打日志比对。比登录点真实应用快得多，还能同页跑「修复前 / 修复后」两版对照。
- **样式类 bug**：在探针页里用**内联样式现场还原旧声明**搭对照组，
  比对测量数值（高度、`scrollWidth` vs `clientWidth`），避免"改了但其实没生效"。
- **改完 `css/style.css` 必须提醒用户强制刷新**（`⌘ + Shift + R`），缓存极顽固。
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

---

## 部署

- **CloudBase 静态托管**：`manageHosting(upload)`，线上地址
  `https://teacheryo-d5g4wbd0sde42bcf6-1482570882.tcloudbaseapp.com`
  （凭据过期用本地 `tcb` CLI 兜底）
- **GitHub Pages**：推 `main` 分支即自动部署到
  `https://qiuyue-lab.github.io/teacheryo-whiteboard/`
- 部署后记得**把 `config.local.js` 一起上传**（它不在 Git 里，但运行时需要）
- ⚠️ **默认的 `*.tcloudbaseapp.com` 是腾讯云「测试域名」**：真实浏览器首次访问会先看到
  一页「风险提醒 · 页面访问提示」，要手动点「确定访问」才进应用。
  **命令行/脚本直接拉取不会看到这层拦截**（所以"用脚本验证线上内容"会漏掉它）。
  要彻底去掉只能绑定自有域名。上线给真实班级用之前，务必自己用浏览器点一遍确认。
- ⚠️ **`anon` / `authenticated` 的权限边界（2026-09-17 实测更正）**：迁移 SQL 里写的是
  `GRANT SELECT ON courses, boards TO anon`，但**线上实测「经 CloudBase JS SDK 匿名登录」的用户
  走的是 `authenticated` 角色**（`boards` 的 UPDATE 实际能成功）。所以线上是可以正常改数据
  （改 step、改课程封面都能落库），但也意味着**别在线上拿真实课程做破坏性实验**。
  需要区分「只是读」和「要写」时，先想清楚这一条。

---

## 当前状态

- 已开源：`github.com/qiuyue-lab/teacheryo-whiteboard`（MIT，gh 账号 `qiuyue-lab`）
- 已内置 `.workbuddy/skills/visual-cognition-slides/`（MIT，来源 edu-ai-builders），
  作为项目的视觉设计语言参考
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
- **随机点名**：`boards.type = 'rollcall'`，学生扫码填名字 → 写一条
  `submissions.type='signin'`（复用 submissions，不新增表）；老师端可随机抽人 / 随机分组。

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
