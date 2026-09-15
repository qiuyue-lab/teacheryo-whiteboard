# STYLES.md — 主题系统

> 在 Step 3（风格选择确认后）和 Step 5（生成HTML时）读取。
> 每个主题包含完整的 CSS 变量、字体、纹理、阴影规范。

---

## 主题速查

| # | 主题 | 适合场景 | 气质 |
|---|------|----------|------|
| 1 | 手绘创意 | 教育科普/社媒/播客 | 温暖、手工感、信任 |
| 2 | 学术简约 | 学术讲座/研究报告 | 严谨、清晰、专业 |
| 3 | 商务专业 | 企业汇报/提案 | 干净、高效、可信 |
| 4 | 深色极简 | 技术分享/产品发布 | 酷、现代、专注 |
| 5 | 暖色插画 | K12课堂/亲子/低年级 | 可爱、活泼、安全 |
| 6 | 科研极客 | 数据论文/学术海报 | 精确、密度感、高信息量 |
| 7 | 3D 立体 | 产品/科技/工程 | 空间感、未来、沉浸 |
| 8 | 纯动画概念 | 抽象原理/哲学/逻辑 | 极简、运动即信息 |

---

## 主题 1：手绘创意（默认）

适合：教育内容创作者、科普视频、社媒口播

```css
:root {
  /* 颜色 */
  --bg:      #f5f0e8;
  --ink:     #1a1410;
  --accent1: #c8432a;   /* 红：警示/强调 */
  --accent2: #2a5fc8;   /* 蓝：信息/步骤 */
  --accent3: #e8a020;   /* 金：高亮/注释 */
  --accent4: #2a8c4a;   /* 绿：结果/正向 */
  --accent5: #6b3fa0;   /* 紫：次要强调 */
  --white:   #ffffff;

  /* 字体 */
  --font-display: 'Caveat', cursive;         /* 大字/标题 */
  --font-label:   'Space Mono', monospace;   /* 标签/代码 */
  --font-body:    'Noto Sans SC', sans-serif;/* 正文 */

  /* 字号（用于横版1920×1080）*/
  --size-hero:    104px;
  --size-display: 88px;
  --size-h1:      52px;
  --size-h2:      36px;
  --size-body:    26px;
  --size-label:   18px;
  --size-caption: 14px;

  /* 卡片 */
  --card-bg:     #ffffff;
  --card-border: 2px solid var(--ink);
  --card-shadow: 6px 6px 0 var(--ink);     /* hard shadow */
  --card-radius: 4px;

  /* 背景纹理 */
  --texture: radial-gradient(circle, rgba(26,20,16,.1) 1.5px, transparent 1.5px);
  --texture-size: 40px 40px;
}

/* Google Fonts */
/* @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Space+Mono&family=Noto+Sans+SC:wght@400;900&display=swap'); */
```

**设计规则：**
- 背景始终用 dot-grid 纹理
- 阴影用 hard shadow（无模糊），体现手工印刷感
- 每个主要组件有 border + shadow
- 可以用 Caveat 写大号中文，亲切不失力量

---

## 主题 2：学术简约

适合：大学讲座、学术报告、研究成果分享

```css
:root {
  --bg:      #ffffff;
  --ink:     #111827;
  --accent1: #1d4ed8;   /* 蓝 */
  --accent2: #7c3aed;   /* 紫 */
  --accent3: #059669;   /* 绿 */
  --accent4: #d97706;   /* 琥珀 */
  --white:   #ffffff;

  --font-display: 'Playfair Display', serif;     /* 衬线标题，学术感 */
  --font-label:   'Source Code Pro', monospace;
  --font-body:    'Source Sans 3', sans-serif;

  --size-hero:    80px;
  --size-display: 64px;
  --size-h1:      44px;
  --size-h2:      30px;
  --size-body:    22px;
  --size-label:   16px;

  --card-bg:     #f9fafb;
  --card-border: 1px solid #e5e7eb;
  --card-shadow: 0 4px 16px rgba(0,0,0,.06);
  --card-radius: 8px;

  --texture: none;
}

/* @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Code+Pro&family=Source+Sans+3:wght@400;700&display=swap'); */
```

**设计规则：**
- 大量留白，信息密度低，每页内容少
- 引用用左侧竖线 + 斜体
- 数据图表用细线，不用粗边框
- 颜色使用克制，以蓝紫为主

---

## 主题 3：商务专业

适合：企业汇报、提案、客户演示

```css
:root {
  --bg:      #f8fafc;
  --ink:     #0f172a;
  --accent1: #0ea5e9;   /* 天蓝 */
  --accent2: #f59e0b;   /* 琥珀 */
  --accent3: #10b981;   /* 翠绿 */
  --accent4: #ef4444;   /* 红 */
  --white:   #ffffff;

  --font-display: 'DM Sans', sans-serif;
  --font-label:   'JetBrains Mono', monospace;
  --font-body:    'DM Sans', sans-serif;

  --size-hero:    72px;
  --size-display: 60px;
  --size-h1:      40px;
  --size-h2:      28px;
  --size-body:    20px;
  --size-label:   15px;

  --card-bg:     #ffffff;
  --card-border: 1px solid #e2e8f0;
  --card-shadow: 0 1px 3px rgba(0,0,0,.1), 0 8px 24px rgba(0,0,0,.04);
  --card-radius: 12px;

  --texture: linear-gradient(rgba(14,165,233,.03) 1px, transparent 1px),
             linear-gradient(90deg, rgba(14,165,233,.03) 1px, transparent 1px);
  --texture-size: 60px 60px;
}

/* 顶部强调条 */
.slide-accent-bar {
  position:absolute; top:0; left:0; right:0; height:4px;
  background:linear-gradient(90deg, var(--accent1), var(--accent2));
}
```

**设计规则：**
- 结论优先：最重要的数字/结论放最大、最显眼
- 每张slide必须有一个"关键数字"或"关键结论"高亮
- 使用细格线纹理，体现专业感
- 圆角卡片，软阴影

---

## 主题 4：深色极简

适合：技术分享、开发者大会、产品发布

```css
:root {
  --bg:      #0f0f0f;
  --ink:     #ededed;
  --accent1: #a3e635;   /* 荧光绿 */
  --accent2: #38bdf8;   /* 天蓝 */
  --accent3: #f472b6;   /* 粉红 */
  --accent4: #fbbf24;   /* 金 */
  --dim:     rgba(237,237,237,.4);
  --white:   #1a1a1a;   /* "白"是深灰卡片 */

  --font-display: 'Inter', sans-serif;
  --font-label:   'Fira Code', monospace;
  --font-body:    'Inter', sans-serif;

  --size-hero:    96px;
  --size-display: 80px;
  --size-h1:      48px;
  --size-h2:      32px;
  --size-body:    22px;
  --size-label:   16px;

  --card-bg:     #1a1a1a;
  --card-border: 1px solid rgba(237,237,237,.08);
  --card-shadow: 0 0 0 1px rgba(163,230,53,.15);
  --card-radius: 8px;

  --texture: radial-gradient(rgba(163,230,53,.04) 1px, transparent 1px);
  --texture-size: 32px 32px;
}

/* 霓虹发光效果 */
.neon {
  text-shadow: 0 0 10px currentColor, 0 0 30px currentColor;
}
.neon-border {
  box-shadow: 0 0 0 1px var(--accent1), 0 0 16px rgba(163,230,53,.3);
}
```

**设计规则：**
- 背景绝对黑（不要深蓝，不要灰），只有 #0f0f0f 或 #000
- 一个页面只用一种强调色
- 代码块风格呈现标签（Fira Code）
- 可以使用发光效果，但克制

---

## 主题 5：暖色插画

适合：K12教育、亲子课程、低年级学生、轻松主题

```css
:root {
  --bg:      #fffbf0;
  --ink:     #2d1b00;
  --accent1: #f97316;   /* 橙 */
  --accent2: #8b5cf6;   /* 紫 */
  --accent3: #22c55e;   /* 绿 */
  --accent4: #ec4899;   /* 粉 */
  --accent5: #06b6d4;   /* 青 */
  --white:   #ffffff;

  --font-display: 'Nunito', sans-serif;
  --font-label:   'Quicksand', sans-serif;
  --font-body:    'Nunito', sans-serif;

  --size-hero:    96px;
  --size-display: 80px;
  --size-h1:      52px;
  --size-h2:      36px;
  --size-body:    28px;   /* 更大，方便阅读 */
  --size-label:   20px;

  --card-bg:     #ffffff;
  --card-border: 3px solid var(--ink);
  --card-shadow: 5px 5px 0 var(--ink);
  --card-radius: 16px;   /* 圆角更大 */

  --texture: radial-gradient(circle, rgba(249,115,22,.06) 2px, transparent 2px);
  --texture-size: 48px 48px;
}

/* 彩色角标 */
.corner-badge {
  position:absolute; top:-12px; right:-12px;
  width:48px; height:48px; border-radius:50%;
  background:var(--accent1); border:3px solid var(--ink);
  display:flex; align-items:center; justify-content:center;
  font-size:24px;
}

/* 抖动动画（活泼感）*/
.wiggle { animation: wiggle .6s ease infinite; }
@keyframes wiggle {
  0%,100% { transform:rotate(-3deg); }
  50%      { transform:rotate(3deg); }
}
```

**设计规则：**
- 大量 emoji 使用，每张 slide 至少一个大图标
- 圆角比其他主题大一倍
- 颜色饱和度高，多种颜色共存
- 字号比其他主题大20%
- 可以用小动画（抖动/弹跳）增加活泼感

---

## 主题 6：科研极客

适合：学术海报、数据分析报告、论文答辩、研究者分享

```css
:root {
  --bg:      #fafafa;
  --ink:     #0a0a0a;
  --accent1: #2563eb;   /* 蓝 */
  --accent2: #dc2626;   /* 红（图表用）*/
  --accent3: #16a34a;   /* 绿（正值）*/
  --accent4: #7c3aed;   /* 紫（第4系列）*/
  --dim:     #6b7280;
  --white:   #ffffff;

  --font-display: 'IBM Plex Sans', sans-serif;
  --font-label:   'IBM Plex Mono', monospace;
  --font-body:    'IBM Plex Sans', sans-serif;

  --size-hero:    64px;
  --size-display: 52px;
  --size-h1:      36px;
  --size-h2:      26px;
  --size-body:    20px;   /* 更小，信息密度高 */
  --size-label:   14px;

  --card-bg:     #ffffff;
  --card-border: 1px solid #d1d5db;
  --card-shadow: 0 2px 8px rgba(0,0,0,.06);
  --card-radius: 4px;

  --texture: none;
}

/* 学术引用样式 */
.citation {
  font-family:var(--font-label); font-size:13px;
  color:var(--dim); vertical-align:super; font-size:11px;
}
.footnote { border-top:1px solid #d1d5db; padding-top:12px; font-size:14px; color:var(--dim); }

/* 数据表格 */
.data-table { border-collapse:collapse; width:100%; font-size:18px; }
.data-table th { background:#f3f4f6; border:1px solid #d1d5db; padding:8px 16px; font-family:var(--font-label); }
.data-table td { border:1px solid #e5e7eb; padding:8px 16px; }
.data-table tr:hover td { background:#f9fafb; }
```

**设计规则：**
- 信息密度高，允许多列布局
- 图表必须有图注（caption）
- 颜色体系为数据可视化优化（色盲友好：蓝/橙/绿）
- 可以用小字体注释，但主要内容仍需清晰

---

## 主题 7：3D 立体

适合：产品演示、工程解说、空间设计、建筑

```css
:root {
  --bg:      #0d1117;
  --bg2:     #161b22;
  --ink:     #e6edf3;
  --accent1: #58a6ff;   /* 亮蓝 */
  --accent2: #3fb950;   /* 亮绿 */
  --accent3: #ff7b72;   /* 亮红 */
  --accent4: #d2a8ff;   /* 淡紫 */
  --dim:     rgba(230,237,243,.5);
  --white:   #161b22;

  --font-display: 'Space Grotesk', sans-serif;
  --font-label:   'Space Mono', monospace;
  --font-body:    'Space Grotesk', sans-serif;

  --size-hero:    88px;
  --size-display: 72px;
  --size-h1:      44px;
  --size-h2:      30px;
  --size-body:    22px;
  --size-label:   16px;

  --card-bg:     rgba(22,27,34,.8);
  --card-border: 1px solid rgba(88,166,255,.2);
  --card-shadow: 0 0 0 1px rgba(88,166,255,.1), 0 16px 48px rgba(0,0,0,.4);
  --card-radius: 12px;

  --texture: radial-gradient(rgba(88,166,255,.05) 1px, transparent 1px);
  --texture-size: 40px 40px;
}

/* 3D 卡片效果 */
.card-3d {
  transform-style:preserve-3d;
  transition:transform .3s ease;
}
.card-3d:hover { transform:perspective(800px) rotateY(-8deg) rotateX(4deg) translateZ(20px); }

/* 玻璃拟态 */
.glass {
  background:rgba(22,27,34,.6);
  backdrop-filter:blur(16px);
  border:1px solid rgba(88,166,255,.15);
}

/* 扫光动画 */
.shimmer {
  background:linear-gradient(90deg, transparent 30%, rgba(88,166,255,.1) 50%, transparent 70%);
  background-size:200% 100%;
  animation:shimmer 3s ease infinite;
}
@keyframes shimmer { from{background-position:200%} to{background-position:-200%} }

/* 网格背景（科技感）*/
.grid-bg {
  background-image:
    linear-gradient(rgba(88,166,255,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(88,166,255,.04) 1px, transparent 1px);
  background-size:60px 60px;
}
```

**3D CSS 技术规范：**
```css
/* 透视设置 */
.scene { perspective:1200px; perspective-origin:center center; }
.object { transform-style:preserve-3d; }

/* 六面体示例 */
.cube { width:200px; height:200px; transform-style:preserve-3d; animation:rotateCube 8s linear infinite; }
.cube-face { position:absolute; width:200px; height:200px; border:2px solid var(--accent1); opacity:.8; }
.cube-face.front  { transform:translateZ(100px); }
.cube-face.back   { transform:translateZ(-100px) rotateY(180deg); }
.cube-face.top    { transform:rotateX(90deg) translateZ(100px); }
.cube-face.bottom { transform:rotateX(-90deg) translateZ(100px); }
.cube-face.left   { transform:rotateY(-90deg) translateZ(100px); }
.cube-face.right  { transform:rotateY(90deg) translateZ(100px); }
@keyframes rotateCube { to { transform:rotateY(360deg) rotateX(15deg); } }
```

---

## 主题 8：纯动画概念

适合：抽象原理、哲学概念、逻辑推理、数学、"纯概念"讲解

```css
:root {
  --bg:      #f0f0f0;
  --ink:     #111111;
  --accent1: #111111;   /* 极简，只用黑白 */
  --accent2: #555555;
  --accent3: #888888;
  --highlight: #ff3300; /* 唯一的颜色，用于关键时刻 */
  --white:   #ffffff;

  --font-display: 'DM Mono', monospace;
  --font-label:   'DM Mono', monospace;
  --font-body:    'DM Sans', sans-serif;

  --size-hero:    120px;  /* 更大，文字本身就是视觉 */
  --size-display: 96px;
  --size-h1:      60px;
  --size-h2:      40px;
  --size-body:    28px;
  --size-label:   18px;

  --card-bg:     transparent;
  --card-border: 2px solid var(--ink);
  --card-shadow: none;
  --card-radius: 0;       /* 无圆角，几何感 */

  --texture: none;
}

/* 运动即信息：动画本身承载概念 */

/* 慢速旋转（无限循环，表示"持续过程"）*/
.slow-rotate { animation:slowRot 20s linear infinite; }
@keyframes slowRot { to{transform:rotate(360deg)} }

/* 呼吸（表示"存在/活着"）*/
.breathe { animation:breathe 4s ease-in-out infinite; }
@keyframes breathe {
  0%,100%{transform:scale(1);opacity:.7}
  50%{transform:scale(1.05);opacity:1}
}

/* 相互靠近（表示"关系/吸引"）*/
@keyframes attract {
  0%,100%{transform:translateX(0)}
  50%{transform:translateX(20px)}
}

/* SVG 路径描绘（表示"推导/生长"）*/
.draw-path {
  stroke-dasharray:var(--pathLen, 1000);
  stroke-dashoffset:var(--pathLen, 1000);
}
.draw-path.animate { animation:drawPath 2s ease forwards; }
@keyframes drawPath { to{stroke-dashoffset:0} }
```

**设计规则：**
- 颜色极简：黑白为主，只在关键时刻用一种强调色
- 动画本身承载意义，不是装饰
- 大量留白，视觉焦点极集中
- SVG 和 Canvas 是主要表达媒介

---

## 字体引入快速参考

```html
<!-- 主题1: 手绘创意 -->
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Space+Mono&family=Noto+Sans+SC:wght@400;900&display=swap" rel="stylesheet">

<!-- 主题2: 学术简约 -->
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Code+Pro&family=Source+Sans+3:wght@400;700&display=swap" rel="stylesheet">

<!-- 主题3: 商务专业 -->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=JetBrains+Mono&display=swap" rel="stylesheet">

<!-- 主题4: 深色极简 -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Fira+Code&display=swap" rel="stylesheet">

<!-- 主题5: 暖色插画 -->
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&family=Quicksand:wght@500;700&display=swap" rel="stylesheet">

<!-- 主题6: 科研极客 -->
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;700&family=IBM+Plex+Mono&display=swap" rel="stylesheet">

<!-- 主题7: 3D立体 -->
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Space+Mono&display=swap" rel="stylesheet">

<!-- 主题8: 纯动画概念 -->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=DM+Mono&display=swap" rel="stylesheet">
```
