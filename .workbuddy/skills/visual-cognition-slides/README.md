# 视觉认知技能 — Visual Cognition Skill
### 用 AI 把知识变成能被看见、记住的东西

by 爱思考的伊伊子 · [小红书]() · [YouTube]() · [GitHub]()

---

## 这个 skill 解决什么问题

> **frontend-slides** 解决："我怎么让 slides 好看？"
>
> **visual-cognition-slides** 解决："我怎么让知识真正被记住？"

两者都输出 HTML slides。但出发点不同：这个 skill 的每一个决策——叙事结构选什么、每张 slide 用什么布局、用什么动画——都来自一个问题：**观众在这里需要完成什么认知动作？**

这不是设计工具，是教学设计工具。

---

## 核心差异

| | 普通 AI 生成 slides | frontend-slides | visual-cognition-skill |
|--|---------------------|-----------------|------------------------|
| **出发点** | "我要讲什么" | "我想要什么风格" | "观众需要经历什么" |
| **叙事设计** | ❌ | ❌ | ✅ 有理论框架的叙事结构 |
| **知识类型诊断** | ❌ | ❌ | ✅ 概念/程序/叙事/关系/元认知 |
| **动画选择逻辑** | 随机 | 风格驱动 | ✅ 认知目标驱动 |
| **理论支撑** | 无 | 无 | ✅ 6个认知科学原则 |
| **内容类型区分** | 无 | 无 | ✅ 微课/讲座/口播/报告 |
| **PPTX 导入** | ❌ | ❌ | ✅ Python 脚本 |
| **PDF 导入** | ❌ | ❌ | ✅ 图片/文字两种模式 |
| **浏览器内编辑** | ❌ | ✅ | ✅ E 键触发 + 一键导出 |
| **中文原生支持** | 一般 | ❌ 全英文 | ✅ 中文优先 |
| **响应式方案** | 不稳定 | clamp() + 100vh | ✅ clamp() + 比例缩放 |
| **主题数量** | 1-3 | 12 | 8（覆盖插画/3D/极简概念）|

---

## 适合谁用

**最适合：**
- 教师、研究者、博士生——需要有效传递知识，不只是"好看"
- 内容创作者——口播视频、科普系列、知识类账号
- 做分享、演讲、内部培训的人

**不太适合：**
- 纯商业演示（用 PowerPoint 或 Keynote 更快）
- 需要实时协作编辑（用 Google Slides）

---

## 使用方式

### 方式一：Claude.ai 直接使用

把 `SKILL.md` 内容粘贴到对话开头作为 System Prompt，然后开始对话：

```
我想做一个关于[主题]的[微课/口播/讲座/报告]，
受众是[谁]，大概[N]分钟。
```

### 方式二：Claude Code skill

```bash
git clone https://github.com/edu-ai-builders/visual-cognition-slides ~/.claude/skills/visual-cognition-slides
```

在 Claude Code 中输入 `/visual-cognition-slides` 触发。

### 方式三：PPTX 转换

```bash
# 安装依赖
pip install python-pptx Pillow

# 转换
python3 scripts/pptx_to_slides.py 我的课件.pptx

# 在浏览器打开，按 E 键进入编辑模式，修改后一键导出
```

### 方式四：PDF 转换

```bash
pip install pymupdf Pillow

# 图片模式（保留原版式）
python3 scripts/pdf_to_slides.py 论文.pdf

# 文字模式（可编辑）
python3 scripts/pdf_to_slides.py 论文.pdf --text
```

---

## 文件结构

```
visual-cognition-slides/
├── SKILL.md          # AI 主控文件（~150行，地图式）
├── PEDAGOGY.md       # 教学理论 × 视觉表达（核心差异所在）
├── ANIMATIONS.md     # 动画库（10个章节，含完整代码）
├── STYLES.md         # 8个主题系统（含插画/3D/极简概念）
├── FORMATS.md        # 画布规范 + slide序列模板 + 响应式
├── README.md         # 本文件
├── scripts/
│   ├── pptx_to_slides.py   # PPTX → HTML 转换
│   └── pdf_to_slides.py  # PDF → HTML 转换
└── examples/
    └── example-conversations.md  # 示例对话
```

**Progressive Disclosure 架构**：`SKILL.md` 只有 ~150 行，是地图。其他文件在需要时才读取。这样 AI 在处理简单请求时不会浪费上下文，在处理复杂请求时才加载完整能力。

---

## 动画能表达什么

这个 skill 的核心信念：**动画不是装饰，是认知工具。**

类似 3Blue1Brown / VideoTutor 的思路——用运动和变形表达概念本身：

| 你想说的 | 用动画表达 |
|----------|-----------|
| A 导致 B | 多米诺连锁动画 |
| 比例/规模感 | 100个方格填满X个 |
| 系统/生态 | 轨道运动，工具围绕核心 |
| 过程/机制 | 流程节点，数据流动粒子 |
| 历史演化 | 时间轴生长动画 |
| 误解→真相 | 3D翻转卡片 |
| 影响力扩散 | 涟漪/波纹动画 |
| 抽象关系 | SVG 路径描绘 |
| 框架/分类 | 混乱→有序排列动画 |
| 数学公式 | 单位圆/几何变换 |

动画库（`ANIMATIONS.md`）包含 10 个章节的完整可复用代码。

---

## 背后的理论（对感兴趣的人）

skill 的每个决策都有认知科学依据，但对使用者透明。想了解的话：

- **认知负荷理论**（Sweller）→ 一张 slide 一个认知单元
- **双通道理论**（Mayer）→ 口播讲一件事，slide 显示另一件事，不重复
- **先验知识激活** → 每个新概念配一个日常类比
- **逆向设计**（McTighe）→ 先问"他们听完要做什么"，再设计内容
- **叙事传输理论** → 故事结构比信息堆砌更容易被记住
- **好奇缺口理论**（Loewenstein）→ 封面制造信息差，引发继续看的欲望

---

## 关于这个项目

这个 skill 来自我制作「爱思考的伊伊子 · AI × 教育」系列视频的实践积累。

超过 10 期视频、数十轮迭代，我把这些经验提炼成一套方法论，再用 AI 把方法论工具化。

**我相信**：任何人，只要有东西想说，都应该能做出不让人视觉疲倦、真正有效传递知识的内容。不需要学设计，不需要懂认知科学——但要有一个懂这些的协作者。

这个 skill 就是那个协作者。

---

## 版本

**v2.0**（当前）
- Progressive disclosure 架构重建
- 动画库扩充至 10 章节
- 8个主题（含插画、3D、极简概念）
- PPTX + PDF 转换脚本
- 浏览器内编辑 + 导出
- clamp() 响应式字号系统

**v1.0**（原版）
- 单文件 SKILL.md
- 5个主题
- 无转换脚本

**v3.0（计划）**
- 视频嵌入支持
- 讲师头像/出镜框
- 双语（中/英）版本

---

MIT License · 自由使用修改分享，保留署名即可
