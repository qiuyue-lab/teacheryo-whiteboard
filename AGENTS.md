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
| `index.html` | 老师端全部逻辑（课程、发起互动、大屏、下发弹窗） | 高，改前先读懂 `renderBoardBody` |
| `student.html` | 学生端（输码进入、共享看板、提交） | 中 |
| `js/common.js` | 公共渲染器：无限画布、便签渲染、一键整理、各类型结果渲染 | **最高**，前后端共用 |
| `js/db.js` | 数据层入口：环境探测 + 两模式共用工具 | 高（见约束 2） |
| `js/store.local.js` | 本地模式实现（localStorage） | 高（见约束 2） |
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

---

## 部署

- **CloudBase 静态托管**：`manageHosting(upload)`，线上地址
  `https://teacheryo-d5g4wbd0sde42bcf6-1482570882.tcloudbaseapp.com`
  （凭据过期用本地 `tcb` CLI 兜底）
- **GitHub Pages**：推 `main` 分支即自动部署到
  `https://qiuyue-lab.github.io/teacheryo-whiteboard/`
- 部署后记得**把 `config.local.js` 一起上传**（它不在 Git 里，但运行时需要）

---

## 当前状态

- 已开源：`github.com/qiuyue-lab/teacheryo-whiteboard`（MIT，gh 账号 `qiuyue-lab`）
- 已内置 `.workbuddy/skills/visual-cognition-slides/`（MIT，来源 edu-ai-builders），
  作为项目的视觉设计语言参考

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
