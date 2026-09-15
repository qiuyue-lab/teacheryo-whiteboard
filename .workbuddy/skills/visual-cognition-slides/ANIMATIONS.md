# ANIMATIONS.md — 动画库

> 在 Step 4/5 时读取。HTML 的核心优势：任何 JS 框架最终都在调用 HTML/CSS/SVG。
> 优先用动画表达概念，而非文字+图标。类 VideoTutor/3Blue1Brown 的讲解方式。

---

## 动画哲学

动画的价值在于**让不可见的变可见**：
- 抽象关系的结构 → 空间中的形状和运动
- 时间上的变化 → 动态过程
- 数量的大小 → 视觉面积和数量
- 因果链 → 连锁反应动画
- 认知框架 → 从混乱到有序的整理过程

**控制权原则**：所有动画默认暂停，由用户点击触发，不自动播放。
**可重播原则**：复杂动画需要重播按钮。
**时长原则**：过渡动画 ≤ 400ms；概念演示动画无限制，但要有节奏感。

---

## § 1 类比动画

### 1.1 双栏对应展开

```html
<!-- 用途：展示"A 就像 B"的结构对应 -->
<div class="analogy-stage">
  <div class="analogy-left" id="known">
    <div class="a-icon">🍽️</div>
    <div class="a-label">餐厅点菜</div>
    <div class="a-items">
      <div class="a-item" data-pair="1">菜单</div>
      <div class="a-item" data-pair="2">服务员</div>
      <div class="a-item" data-pair="3">厨房</div>
    </div>
  </div>

  <svg class="analogy-bridge" id="bridge" viewBox="0 0 200 300">
    <!-- 连线由 JS 动态绘制 -->
  </svg>

  <div class="analogy-right" id="new-concept">
    <div class="a-icon">🤖</div>
    <div class="a-label">API 调用</div>
    <div class="a-items">
      <div class="a-item" data-pair="1">接口文档</div>
      <div class="a-item" data-pair="2">HTTP 请求</div>
      <div class="a-item" data-pair="3">服务器</div>
    </div>
  </div>
</div>

<style>
.analogy-stage { display:flex; align-items:center; gap:0; width:100%; }
.analogy-left, .analogy-right { flex:0 0 380px; padding:40px; }
.analogy-bridge { flex:1; height:300px; }
.a-item {
  padding:12px 20px; margin:8px 0;
  border:2px solid var(--ink); background:var(--white);
  font-size:22px; opacity:0;
  transition: opacity .4s, transform .4s;
  transform: translateX(-20px);
}
.analogy-right .a-item { transform: translateX(20px); }
.a-item.show { opacity:1; transform:none; }
.bridge-line {
  stroke: var(--gold); stroke-width:2; stroke-dasharray:200;
  stroke-dashoffset:200; fill:none;
  animation: drawLine .6s ease forwards;
}
@keyframes drawLine { to { stroke-dashoffset:0; } }
</style>

<script>
let analogyStep = 0;
function runAnalogy() {
  const leftItems  = document.querySelectorAll('.analogy-left .a-item');
  const rightItems = document.querySelectorAll('.analogy-right .a-item');
  const bridge     = document.getElementById('bridge');
  if (analogyStep < leftItems.length) {
    leftItems[analogyStep].classList.add('show');
    rightItems[analogyStep].classList.add('show');
    // draw SVG line connecting them
    const li = leftItems[analogyStep].getBoundingClientRect();
    const ri = rightItems[analogyStep].getBoundingClientRect();
    const sv = bridge.getBoundingClientRect();
    const line = document.createElementNS('http://www.w3.org/2000/svg','path');
    const x1=0, y1=li.top+li.height/2-sv.top;
    const x2=200, y2=ri.top+ri.height/2-sv.top;
    line.setAttribute('d',`M${x1},${y1} C100,${y1} 100,${y2} ${x2},${y2}`);
    line.setAttribute('class','bridge-line');
    line.style.animationDelay = '.3s';
    bridge.appendChild(line);
    analogyStep++;
  }
}
</script>
```

---

### 1.2 等号揭示（简洁版）

```html
<!-- 用途：快速建立类比，3步出现 -->
<div class="eq-reveal">
  <div class="eq-left" data-step="1">🔌 USB-C</div>
  <div class="eq-sign" data-step="2">=</div>
  <div class="eq-right" data-step="3">⚡ MCP<br><small>一个接口，连所有工具</small></div>
</div>
<style>
.eq-reveal { display:flex; align-items:center; gap:48px; justify-content:center; }
.eq-left, .eq-right {
  font-family:var(--font-display); font-size:64px; text-align:center;
  padding:32px 48px; border:3px solid var(--ink); box-shadow:8px 8px 0 var(--ink);
}
.eq-sign { font-family:var(--font-display); font-size:96px; color:var(--gold); }
</style>
```

---

## § 2 过程动画（机制可视化）

### 2.1 流程节点动画（数据流）

```html
<!-- 用途：展示数据/信号流动过程 -->
<div class="process-track">
  <div class="proc-node" id="pn0">📥<br><span>输入</span></div>
  <div class="proc-conn"><div class="proc-dot"></div></div>
  <div class="proc-node" id="pn1">⚙️<br><span>处理</span></div>
  <div class="proc-conn"><div class="proc-dot" style="animation-delay:.6s"></div></div>
  <div class="proc-node" id="pn2">📤<br><span>输出</span></div>
</div>

<style>
.process-track { display:flex; align-items:center; gap:0; justify-content:center; }
.proc-node {
  width:140px; height:140px; border-radius:50%;
  border:3px solid var(--ink); display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:8px;
  font-size:36px; background:var(--white);
  box-shadow:6px 6px 0 var(--ink);
  opacity:0; transform:scale(.8);
  transition: all .5s cubic-bezier(.34,1.4,.64,1);
}
.proc-node.active { opacity:1; transform:scale(1); background:var(--cream); }
.proc-node.firing { background:var(--gold); }
.proc-conn { width:120px; height:4px; background:rgba(26,20,16,.15); position:relative; overflow:hidden; }
.proc-dot {
  position:absolute; top:-4px; width:12px; height:12px;
  background:var(--red); border-radius:50%;
  animation: flowDot 1.4s linear infinite;
  opacity:0;
}
.proc-dot.active { opacity:1; }
@keyframes flowDot { from{left:0} to{left:calc(100% - 12px)} }

/* 节点逐步激活 */
.proc-node.glow {
  box-shadow: 6px 6px 0 var(--ink), 0 0 0 6px rgba(232,160,32,.3);
}
</style>

<script>
const nodes = document.querySelectorAll('.proc-node');
const dots  = document.querySelectorAll('.proc-dot');
let pStep = 0;
function activateProcess() {
  if (pStep < nodes.length) {
    nodes[pStep].classList.add('active');
    if (pStep > 0) nodes[pStep].classList.add('glow');
    if (pStep < dots.length) dots[pStep].classList.add('active');
    pStep++;
  }
}
</script>
```

---

### 2.2 ReAct 循环动画（AI 推理循环）

```html
<!-- 用途：展示循环往复的认知/执行过程 -->
<svg class="react-loop" viewBox="0 0 500 500">
  <!-- 三个节点 Think/Act/Observe -->
  <circle class="rl-node" id="rn-think" cx="250" cy="80"  r="60"/>
  <circle class="rl-node" id="rn-act"   cx="420" cy="370" r="60"/>
  <circle class="rl-node" id="rn-obs"   cx="80"  cy="370" r="60"/>
  <!-- 文字 -->
  <text class="rl-label" x="250" y="80"  text-anchor="middle" dominant-baseline="middle">思考</text>
  <text class="rl-label" x="420" y="370" text-anchor="middle" dominant-baseline="middle">行动</text>
  <text class="rl-label" x="80"  y="370" text-anchor="middle" dominant-baseline="middle">观察</text>
  <!-- 弧线箭头 -->
  <path class="rl-arc arc-ta" d="M 295,110 Q 400,200 385,315"/>
  <path class="rl-arc arc-ao" d="M 360,395 Q 250,460 145,395"/>
  <path class="rl-arc arc-ot" d="M 115,315 Q 100,200 205,110"/>
  <!-- 移动粒子 -->
  <circle class="rl-particle" r="10" fill="var(--gold)">
    <animateMotion dur="3s" repeatCount="indefinite" rotate="auto">
      <mpath href="#loop-path"/>
    </animateMotion>
  </circle>
  <path id="loop-path" d="M250,20 Q430,200 420,370 Q250,480 80,370 Q70,200 250,20" fill="none"/>
</svg>

<style>
.react-loop { width:480px; height:480px; }
.rl-node { fill:var(--cream); stroke:var(--ink); stroke-width:3; }
.rl-node.active { fill:var(--gold); }
.rl-label { font-family:var(--font-body); font-size:22px; font-weight:900; fill:var(--ink); }
.rl-arc {
  fill:none; stroke:var(--ink); stroke-width:2.5;
  stroke-dasharray:8,4;
  marker-end:url(#arrow);
}
.rl-arc.highlight { stroke:var(--red); stroke-width:3; stroke-dasharray:none; }
</style>
```

---

### 2.3 状态转变动画（变形）

```html
<!-- 用途：展示事物从一种状态变成另一种 -->
<div class="morph-stage">
  <div class="morph-obj" id="morphObj">
    <!-- SVG 图形，用 GSAP/CSS animation 做形状变形 -->
    <svg viewBox="0 0 200 200">
      <path id="morphPath" d="M100,20 L180,180 L20,180 Z"/>
      <!-- 状态A：三角形；状态B：圆形 -->
    </svg>
  </div>
  <div class="morph-label" id="morphLabel">状态 A</div>
</div>

<style>
/* CSS 形状变形（纯CSS，无需JS库）*/
@keyframes triangleToCircle {
  0%   { d: path("M100,20 L180,180 L20,180 Z"); fill: var(--red); }
  50%  { d: path("M100,10 L175,155 L50,175 Z"); fill: var(--gold); }
  100% { d: path("M100,100 m-80,0 a80,80 0 1,0 160,0 a80,80 0 1,0 -160,0"); fill: var(--blue); }
}
#morphPath.animate { animation: triangleToCircle 1.2s ease-in-out forwards; }
</style>
```

---

## § 3 对比动画

### 3.1 3D 翻转卡片（Before/After）

```html
<!-- 用途：展示误解→真相，旧认知→新认知 -->
<div class="flip-wrap">
  <div class="flip-card" id="fc1" onclick="this.classList.toggle('flipped')">
    <div class="flip-inner">
      <div class="flip-f">
        <div class="f-tag">你以为…</div>
        <div class="f-content"><!-- 误解内容 --></div>
      </div>
      <div class="flip-b">
        <div class="f-tag">其实…</div>
        <div class="f-content"><!-- 真相内容 --></div>
      </div>
    </div>
  </div>
</div>

<style>
.flip-wrap { perspective: 1400px; }
.flip-card { width:520px; height:360px; cursor:pointer; }
.flip-inner {
  width:100%; height:100%; position:relative;
  transform-style:preserve-3d;
  transition:transform .7s cubic-bezier(.4,0,.2,1);
}
.flip-card.flipped .flip-inner { transform:rotateY(180deg); }
.flip-f, .flip-b {
  position:absolute; inset:0; backface-visibility:hidden;
  border:2px solid var(--ink); padding:44px;
  display:flex; flex-direction:column; gap:20px; justify-content:center;
}
.flip-f { background:var(--cream); box-shadow:8px 8px 0 var(--ink); }
.flip-b { background:var(--ink); color:var(--cream); transform:rotateY(180deg); box-shadow:8px 8px 0 var(--gold); }
.f-tag { font-family:var(--font-label); font-size:14px; opacity:.5; letter-spacing:.08em; }
.f-content { font-family:var(--font-display); font-size:48px; line-height:1.2; }
</style>
```

---

### 3.2 滑动对比（Slider 交互）

```html
<!-- 用途：展示两个版本的差异，用户拖动分界线 -->
<div class="slider-compare" id="sliderComp">
  <div class="sc-left"><!-- 左侧内容（"之前"）--></div>
  <div class="sc-right"><!-- 右侧内容（"之后"）--></div>
  <div class="sc-handle" id="scHandle">
    <div class="sc-line"></div>
    <div class="sc-btn">⟺</div>
  </div>
</div>

<style>
.slider-compare { position:relative; width:100%; height:500px; overflow:hidden; cursor:col-resize; }
.sc-left, .sc-right { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
.sc-right { clip-path:inset(0 0 0 50%); }
.sc-handle {
  position:absolute; top:0; left:50%; width:4px; height:100%;
  background:var(--ink); transform:translateX(-50%);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
}
.sc-btn {
  width:40px; height:40px; background:var(--white);
  border:2px solid var(--ink); border-radius:50%;
  display:flex; align-items:center; justify-content:center; font-size:18px;
}
</style>

<script>
const comp   = document.getElementById('sliderComp');
const handle = document.getElementById('scHandle');
const right  = comp.querySelector('.sc-right');
let dragging = false;
comp.addEventListener('mousedown', () => dragging = true);
document.addEventListener('mouseup', () => dragging = false);
document.addEventListener('mousemove', e => {
  if (!dragging) return;
  const rect = comp.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100));
  handle.style.left = pct + '%';
  right.style.clipPath = `inset(0 0 0 ${pct}%)`;
});
</script>
```

---

## § 4 数据动画

### 4.1 计数动画

```html
<div class="counter-wrap">
  <span class="counter-num" data-target="1000000" data-suffix="+">0</span>
  <div class="counter-label">每天新增的 AI 模型</div>
</div>

<script>
function animateCounter(el) {
  const target = +el.dataset.target;
  const suffix = el.dataset.suffix || '';
  const duration = 2000;
  const start = performance.now();
  function update(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // ease-out-cubic
    el.textContent = Math.floor(ease * target).toLocaleString() + suffix;
    if (t < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
</script>
```

---

### 4.2 比例填充动画（面积感知）

```html
<!-- 用途：100个格子里填满X个，直觉感受比例 -->
<div class="ratio-grid" id="ratioGrid">
  <!-- JS 生成100个格子 -->
</div>

<style>
.ratio-grid { display:grid; grid-template-columns:repeat(10,1fr); gap:6px; width:480px; }
.ratio-cell {
  width:40px; height:40px; border:1.5px solid rgba(26,20,16,.15);
  border-radius:4px; background:var(--cream);
  transition: background .1s, border-color .1s;
}
.ratio-cell.filled { background:var(--red); border-color:var(--red); }
</style>

<script>
function buildRatioGrid(container, total, filled, color='var(--red)') {
  for (let i = 0; i < total; i++) {
    const cell = document.createElement('div');
    cell.className = 'ratio-cell';
    container.appendChild(cell);
  }
  // animate fill with delay
  const cells = container.querySelectorAll('.ratio-cell');
  cells.forEach((cell, i) => {
    if (i < filled) {
      setTimeout(() => cell.classList.add('filled'), i * 30);
    }
  });
}
buildRatioGrid(document.getElementById('ratioGrid'), 100, 73);
</script>
```

---

### 4.3 SVG 折线图绘制动画

```html
<svg class="line-chart" viewBox="0 0 800 400">
  <!-- 坐标轴 -->
  <line x1="60" y1="360" x2="760" y2="360" stroke="var(--ink)" stroke-width="2"/>
  <line x1="60" y1="20"  x2="60"  y2="360" stroke="var(--ink)" stroke-width="2"/>
  <!-- 数据折线（stroke-dasharray 动画绘制）-->
  <path id="chartLine"
    d="M100,300 L200,250 L300,180 L400,120 L500,80 L600,50 L700,30"
    fill="none" stroke="var(--red)" stroke-width="3"
    stroke-dasharray="1000" stroke-dashoffset="1000"/>
  <!-- 数据点（逐个出现）-->
  <circle class="chart-dot" cx="100" cy="300" r="8" fill="var(--red)"/>
  <!-- 更多点... -->
</svg>

<script>
function drawChart() {
  const line = document.getElementById('chartLine');
  line.style.transition = 'stroke-dashoffset 1.5s ease-out';
  line.style.strokeDashoffset = '0';
  // 数据点延迟出现
  document.querySelectorAll('.chart-dot').forEach((dot, i) => {
    setTimeout(() => { dot.style.opacity = '1'; dot.style.transform = 'scale(1)'; }, i * 200 + 500);
  });
}
</script>
```

---

## § 5 时间线动画

### 5.1 水平时间轴生长

```html
<div class="timeline-h">
  <div class="tl-track">
    <div class="tl-line" id="tlLine"></div>
    <!-- 节点 -->
    <div class="tl-node" style="left:10%"  data-year="1950">
      <div class="tl-dot"></div>
      <div class="tl-label top">图灵测试<br><small>1950</small></div>
    </div>
    <div class="tl-node" style="left:35%"  data-year="1997">
      <div class="tl-dot"></div>
      <div class="tl-label bot">深蓝击败卡斯帕罗夫<br><small>1997</small></div>
    </div>
    <div class="tl-node" style="left:60%"  data-year="2017">
      <div class="tl-dot"></div>
      <div class="tl-label top">Transformer<br><small>2017</small></div>
    </div>
    <div class="tl-node" style="left:85%"  data-year="2022">
      <div class="tl-dot"></div>
      <div class="tl-label bot">ChatGPT<br><small>2022</small></div>
    </div>
  </div>
</div>

<style>
.timeline-h { width:100%; padding:40px 60px; }
.tl-track { position:relative; height:120px; }
.tl-line {
  position:absolute; top:50%; left:0;
  height:3px; background:var(--ink); width:0;
  transition: width 1.5s ease-out;
}
.tl-line.draw { width:100%; }
.tl-node { position:absolute; top:50%; transform:translate(-50%,-50%); }
.tl-dot {
  width:20px; height:20px; border-radius:50%;
  background:var(--ink); border:3px solid var(--cream);
  box-shadow:0 0 0 3px var(--ink);
  opacity:0; transform:scale(0);
  transition: all .4s cubic-bezier(.34,1.4,.64,1);
}
.tl-node.show .tl-dot { opacity:1; transform:scale(1); }
.tl-label { position:absolute; left:50%; transform:translateX(-50%); white-space:nowrap; font-size:18px; font-weight:900; }
.tl-label.top { bottom:calc(100% + 12px); }
.tl-label.bot { top:calc(100% + 12px); }
</style>

<script>
function drawTimeline() {
  document.getElementById('tlLine').classList.add('draw');
  document.querySelectorAll('.tl-node').forEach((node, i) => {
    setTimeout(() => node.classList.add('show'), i * 400 + 800);
  });
}
</script>
```

---

## § 6 框架动画

### 6.1 2×2 矩阵展开

```html
<!-- 用途：建立分析框架，象限依次出现 -->
<div class="matrix-wrap">
  <div class="matrix-y-label">← 高 · 重要性 · 低 →</div>
  <div class="matrix-grid">
    <div class="matrix-cell q1" data-step="1">
      <div class="q-num">I</div>
      <div class="q-title">重要且紧急</div>
    </div>
    <div class="matrix-cell q2" data-step="2">
      <div class="q-num">II</div>
      <div class="q-title">重要不紧急</div>
    </div>
    <div class="matrix-cell q3" data-step="3">
      <div class="q-num">III</div>
      <div class="q-title">紧急不重要</div>
    </div>
    <div class="matrix-cell q4" data-step="4">
      <div class="q-num">IV</div>
      <div class="q-title">不重要不紧急</div>
    </div>
  </div>
  <!-- 轴线 -->
  <div class="matrix-h-axis"></div>
  <div class="matrix-v-axis"></div>
</div>

<style>
.matrix-grid {
  display:grid; grid-template-columns:1fr 1fr;
  gap:0; width:640px; height:640px; position:relative;
}
.matrix-cell {
  border:2px solid var(--ink); padding:40px;
  display:flex; flex-direction:column; gap:12px;
  opacity:0; transition: opacity .5s, transform .5s;
  transform: scale(.9);
}
.matrix-cell.show { opacity:1; transform:scale(1); }
.q1 { background:rgba(200,67,42,.08); border-color:var(--red); }
.q2 { background:rgba(42,95,200,.08); border-color:var(--blue); }
.q3 { background:rgba(232,160,32,.08); border-color:var(--gold); }
.q4 { background:rgba(26,20,16,.04); }
.q-num { font-family:var(--font-display); font-size:48px; opacity:.3; }
.q-title { font-size:24px; font-weight:900; }
.matrix-h-axis {
  position:absolute; top:50%; left:0; right:0; height:3px;
  background:var(--ink); transform:translateY(-50%);
}
.matrix-v-axis {
  position:absolute; left:50%; top:0; bottom:0; width:3px;
  background:var(--ink); transform:translateX(-50%);
}
</style>
```

---

### 6.2 从混乱到有序（排序动画）

```html
<!-- 用途：展示"引入框架让混乱变有序" -->
<div class="chaos-stage" id="chaosStage">
  <!-- JS 生成随机分布的点，然后动画归位 -->
</div>

<script>
const categories = [
  { label:'概念', color:'var(--red)',  x:20, y:30 },
  { label:'过程', color:'var(--blue)', x:60, y:30 },
  { label:'案例', color:'var(--green)',x:20, y:70 },
  { label:'练习', color:'var(--gold)', x:60, y:70 },
];

function buildChaos(container) {
  const items = [];
  categories.forEach((cat, ci) => {
    for (let i = 0; i < 5; i++) {
      const dot = document.createElement('div');
      dot.className = 'chaos-dot';
      dot.style.cssText = `
        position:absolute;
        left:${Math.random()*90}%;
        top:${Math.random()*90}%;
        background:${cat.color};
        width:20px; height:20px; border-radius:50%;
        transition: all 1s cubic-bezier(.34,1.4,.64,1);
        transition-delay:${i*0.1}s;
      `;
      dot.dataset.catX = cat.x;
      dot.dataset.catY = cat.y;
      container.appendChild(dot);
      items.push(dot);
    }
  });
  return items;
}

function orderChaos(items) {
  // group by category and arrange
  items.forEach((dot, i) => {
    const offset = i % 5;
    dot.style.left  = (+dot.dataset.catX + offset*3) + '%';
    dot.style.top   = (+dot.dataset.catY + (offset > 2 ? 5 : 0)) + '%';
  });
}
</script>
```

---

## § 7 物理模拟动画

### 7.1 粒子系统（信息扩散/连接）

```html
<!-- 用途：展示网络效应、信息传播、分子运动 -->
<canvas id="particleCanvas" width="800" height="500"></canvas>

<script>
class ParticleSystem {
  constructor(canvas, opts={}) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.particles = [];
    this.opts = {
      count:    opts.count    || 60,
      color:    opts.color    || '#c8432a',
      connect:  opts.connect  || true,
      maxDist:  opts.maxDist  || 100,
      speed:    opts.speed    || 0.5,
    };
    this.init();
  }
  init() {
    for (let i = 0; i < this.opts.count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random()-.5) * this.opts.speed,
        vy: (Math.random()-.5) * this.opts.speed,
        r:  Math.random()*3+2,
      });
    }
  }
  draw() {
    const {ctx, canvas, particles, opts} = this;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      // move
      p.x += p.vx; p.y += p.vy;
      if (p.x<0||p.x>canvas.width)  p.vx*=-1;
      if (p.y<0||p.y>canvas.height) p.vy*=-1;
      // draw
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = opts.color;
      ctx.fill();
    });
    if (opts.connect) {
      particles.forEach((a,i) => {
        particles.slice(i+1).forEach(b => {
          const d = Math.hypot(a.x-b.x, a.y-b.y);
          if (d < opts.maxDist) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(26,20,16,${1-d/opts.maxDist})`;
            ctx.lineWidth = .8;
            ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
            ctx.stroke();
          }
        });
      });
    }
    requestAnimationFrame(()=>this.draw());
  }
}
// 使用：new ParticleSystem(canvas).draw();
</script>
```

---

### 7.2 波动/涟漪动画

```html
<!-- 用途：展示影响力扩散、波的传播、情绪蔓延 -->
<div class="ripple-stage">
  <div class="ripple-source" id="rippleSrc" onclick="triggerRipple(this)">
    <div class="rs-icon">🎯</div>
  </div>
</div>

<style>
.ripple-stage { position:relative; width:600px; height:400px; display:flex; align-items:center; justify-content:center; }
.ripple-source { position:relative; z-index:10; cursor:pointer; }
.rs-icon { font-size:64px; }
.ripple-ring {
  position:absolute; top:50%; left:50%;
  border-radius:50%; border:2px solid var(--blue);
  transform:translate(-50%,-50%) scale(0);
  pointer-events:none;
  animation: rippleOut 2s ease-out forwards;
}
@keyframes rippleOut {
  0%   { width:0; height:0; opacity:.8; }
  100% { width:400px; height:400px; opacity:0; }
}
</style>

<script>
function triggerRipple(el) {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const ring = document.createElement('div');
      ring.className = 'ripple-ring';
      el.appendChild(ring);
      setTimeout(() => ring.remove(), 2000);
    }, i * 400);
  }
}
</script>
```

---

## § 8 学科动画

### 8.1 数学公式变换

```html
<!-- 用途：展示公式推导步骤 -->
<div class="formula-stage">
  <div class="formula-line" data-step="1">
    <span class="fm">E</span>
    <span class="fm op">=</span>
    <span class="fm">mc²</span>
  </div>
  <div class="formula-arrow" data-step="2">↓ <small>当 m=1kg, c=3×10⁸ m/s</small></div>
  <div class="formula-line" data-step="3">
    <span class="fm">E</span>
    <span class="fm op">=</span>
    <span class="fm highlight">9×10¹⁶ 焦耳</span>
  </div>
  <div class="formula-analogy" data-step="4">
    ≈ 引爆 <span class="fm highlight">2100万吨</span> TNT 炸药的能量
  </div>
</div>

<style>
.formula-stage { display:flex; flex-direction:column; gap:24px; align-items:flex-start; }
.formula-line { display:flex; align-items:center; gap:16px; }
.fm { font-family:'Courier New', monospace; font-size:56px; font-weight:bold; }
.fm.op { color:var(--gold); }
.fm.highlight { color:var(--red); background:rgba(200,67,42,.08); padding:4px 16px; border-radius:4px; }
.formula-arrow { font-size:24px; opacity:.5; margin-left:16px; }
.formula-analogy { font-size:28px; margin-left:8px; line-height:1.6; }
</style>
```

---

### 8.2 几何变换动画

```html
<!-- 用途：展示几何证明、空间变换、坐标系 -->
<svg class="geo-stage" viewBox="0 0 600 400" id="geoSvg">
  <!-- 坐标轴 -->
  <defs>
    <marker id="arrowHead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="var(--ink)" opacity=".5"/>
    </marker>
  </defs>
  <line x1="50"  y1="350" x2="560" y2="350" stroke="var(--ink)" stroke-width="1.5" opacity=".3" marker-end="url(#arrowHead)"/>
  <line x1="300" y1="380" x2="300" y2="20"  stroke="var(--ink)" stroke-width="1.5" opacity=".3" marker-end="url(#arrowHead)"/>

  <!-- 示例：单位圆 + 角度动画 -->
  <circle cx="300" cy="200" r="120" fill="none" stroke="var(--blue)" stroke-width="2" opacity=".4"/>
  <line id="geoRadius" x1="300" y1="200" x2="420" y2="200" stroke="var(--red)" stroke-width="3"/>
  <circle id="geoPoint" cx="420" cy="200" r="8" fill="var(--red)"/>
  <text id="geoAngleLabel" x="330" y="190" font-size="20" fill="var(--ink)">θ = 0°</text>
</svg>

<script>
let angle = 0;
let geoRunning = false;
function animateGeo() {
  if (!geoRunning) return;
  angle = (angle + 1) % 360;
  const rad = angle * Math.PI / 180;
  const x = 300 + 120 * Math.cos(rad);
  const y = 200 - 120 * Math.sin(rad);
  document.getElementById('geoRadius').setAttribute('x2', x);
  document.getElementById('geoRadius').setAttribute('y2', y);
  document.getElementById('geoPoint').setAttribute('cx', x);
  document.getElementById('geoPoint').setAttribute('cy', y);
  document.getElementById('geoAngleLabel').textContent = `θ = ${angle}°`;
  requestAnimationFrame(animateGeo);
}
</script>
```

---

## § 9 冲击型动画

### 9.1 打字机效果（AI 生成感）

```html
<div class="typewriter-wrap">
  <span id="twOut"></span><span class="tw-cur">▋</span>
</div>

<script>
function typeWrite(text, el=document.getElementById('twOut'), speed=45) {
  let i=0; el.textContent='';
  return new Promise(resolve => {
    const t = setInterval(() => {
      el.textContent += text[i++];
      if (i >= text.length) { clearInterval(t); resolve(); }
    }, speed);
  });
}
// 可链式调用
async function runTypeSequence() {
  await typeWrite('正在分析学生作业...');
  await new Promise(r => setTimeout(r, 600));
  await typeWrite('\n发现3个共同薄弱点 ✓');
  await typeWrite('\n生成个性化练习题 ✓');
}
</script>
<style>
.tw-cur { animation: blinkCur .7s infinite; }
@keyframes blinkCur { 0%,100%{opacity:1} 50%{opacity:0} }
</style>
```

---

### 9.2 脉冲节点（激活/连接感）

```html
<div class="pulse-node">
  <div class="pn-ring r1"></div>
  <div class="pn-ring r2"></div>
  <div class="pn-core">MCP</div>
</div>

<style>
.pulse-node { position:relative; display:inline-flex; align-items:center; justify-content:center; }
.pn-core {
  width:100px; height:100px; border-radius:50%;
  background:var(--ink); color:var(--cream);
  display:flex; align-items:center; justify-content:center;
  font-family:var(--font-label); font-size:20px; z-index:1;
}
.pn-ring {
  position:absolute; border-radius:50%;
  border:2px solid var(--red);
  animation: pulseOut 2.5s ease-out infinite;
}
.r1 { width:100px; height:100px; }
.r2 { width:100px; height:100px; animation-delay:.8s; }
@keyframes pulseOut {
  0%   { width:100px; height:100px; opacity:.7; }
  100% { width:200px; height:200px; opacity:0; }
}
</style>
```

---

### 9.3 轨道运动（系统/生态）

```html
<!-- 用途：展示生态系统、多工具围绕核心运转 -->
<div class="orbital-sys">
  <div class="orb-core">AI</div>
  <div class="orb-ring r1">
    <div class="orb-satellite" style="animation:counterSpin1 8s linear infinite">🗂️</div>
  </div>
  <div class="orb-ring r2" style="animation-duration:14s;animation-direction:reverse">
    <div class="orb-satellite" style="animation:counterSpin2 14s linear infinite reverse">🌐</div>
  </div>
</div>

<style>
.orbital-sys { position:relative; width:400px; height:400px; }
.orb-core {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  width:80px; height:80px; border-radius:50%;
  background:var(--ink); color:var(--cream);
  display:flex; align-items:center; justify-content:center;
  font-family:var(--font-label); font-size:18px; z-index:10;
}
.orb-ring {
  position:absolute; top:50%; left:50%; border-radius:50%;
  border:1.5px dashed rgba(26,20,16,.2);
  animation:orbitSpin linear infinite;
  transform-origin:center center;
}
.r1 { width:200px; height:200px; margin:-100px 0 0 -100px; animation-duration:8s; }
.r2 { width:320px; height:320px; margin:-160px 0 0 -160px; animation-duration:14s; }
.orb-satellite {
  position:absolute; top:-24px; left:50%; transform:translateX(-50%);
  font-size:32px; width:48px; height:48px;
  background:var(--cream); border:2px solid var(--ink);
  border-radius:8px; display:flex; align-items:center; justify-content:center;
  box-shadow:3px 3px 0 var(--ink);
}
@keyframes orbitSpin   { to { transform:rotate(360deg); } }
@keyframes counterSpin1 { to { transform:translateX(-50%) rotate(-360deg); } }
@keyframes counterSpin2 { to { transform:translateX(-50%) rotate(360deg); } }
</style>
```

---

## § 10 全局动画工具

### 10.1 Intersection Observer（滚动触发）

```javascript
// 用于滚动式 slides（替代点击触发）
const observer = new IntersectionObserver(
  entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      entry.target.querySelectorAll('[data-step]').forEach((el, i) => {
        setTimeout(() => el.classList.add('on'), i * 200);
      });
    }
  }),
  { threshold: 0.3 }
);
document.querySelectorAll('.slide').forEach(s => observer.observe(s));
```

### 10.2 缓动函数速查

```javascript
const ease = {
  outCubic:   t => 1 - Math.pow(1-t, 3),
  outElastic: t => t === 1 ? 1 : Math.pow(2,-10*t) * Math.sin((t*10-.75)*2*Math.PI/3) + 1,
  outBounce:  t => {
    const n1=7.5625, d1=2.75;
    if (t<1/d1) return n1*t*t;
    if (t<2/d1) return n1*(t-=1.5/d1)*t+.75;
    if (t<2.5/d1) return n1*(t-=2.25/d1)*t+.9375;
    return n1*(t-=2.625/d1)*t+.984375;
  },
  inOutQuad:  t => t < .5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2,
};
```

### 10.3 鼠标跟随 3D 倾斜

```javascript
// 用于封面卡片、产品展示
function add3DTilt(el) {
  el.addEventListener('mousemove', e => {
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - .5;
    const y = (e.clientY - rect.top)  / rect.height - .5;
    el.style.transform = `perspective(800px) rotateY(${x*15}deg) rotateX(${-y*15}deg) scale(1.02)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = '';
    el.style.transition = 'transform .5s ease';
  });
}

---

## § 11 关系图动画

> **对应 PEDAGOGY §2.4 关系性知识**：动态连接图、维恩图动画、因果链动画
> 认知目标：让学习者看见关系的方向、强度和条件，而非只记住孤立事实。

### 11.1 动态知识连接图（力导向图）

```html
<!-- 用途：展示概念网络，边粗细 = 关系强度；点击逐条揭示新连接 -->
<!-- 认知目标：概念不是列表，是相互关联的网络 -->
<div class="kg-stage">
  <canvas id="kgCanvas"></canvas>
  <button class="kg-btn" onclick="kgRevealEdge()">＋ 添加关系</button>
</div>

<style>
.kg-stage { position:relative; width:100%; height:420px; background:var(--bg); }
.kg-stage canvas { position:absolute; inset:0; width:100%; height:100%; }
.kg-btn {
  position:absolute; bottom:16px; right:16px;
  padding:8px 20px; background:var(--accent2); color:var(--white);
  border:none; border-radius:999px; cursor:pointer; font-size:16px;
  box-shadow: 3px 3px 0 var(--ink);
}
</style>

<script>
(function() {
  // ── 配置（替换为实际概念）──────────────────────────
  const NODES = [
    '认知负荷', '工作记忆', '长期记忆', '先验知识',
    '双通道', '视觉通道', '语言通道', '图式',
    '逆向设计', '教学目标'
  ];
  // [from, to, weight]  weight 1-3 控制边粗细
  const ALL_EDGES = [
    [0,1,3],[0,2,2],[1,2,2],[1,3,1],
    [2,3,3],[3,7,2],[4,5,2],[4,6,2],
    [5,0,1],[6,0,1],[7,2,2],[8,9,3],[8,0,1]
  ];
  // ─────────────────────────────────────────────────

  const canvas = document.getElementById('kgCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, revealedEdges = 0, raf;

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width  = (W * dpr) | 0;
    canvas.height = (H * dpr) | 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // 初始化节点位置（随机，物理模拟收敛）
  const nodes = NODES.map((label, i) => ({
    label,
    x: W * 0.15 + Math.random() * W * 0.7,
    y: H * 0.15 + Math.random() * H * 0.7,
    vx: 0, vy: 0
  }));

  function physics() {
    const cx = W / 2, cy = H / 2;
    const N = nodes.length;
    // 斥力
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = Math.max(1, dx*dx + dy*dy);
        const d  = Math.sqrt(d2);
        const f  = 1800 / d2;
        const fx = (dx/d)*f, fy = (dy/d)*f;
        a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
      }
    }
    // 弹力（已揭示的边）
    const edges = ALL_EDGES.slice(0, revealedEdges);
    for (const [i, j] of edges) {
      const a = nodes[i], b = nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d  = Math.hypot(dx, dy) || 1;
      const f  = (d - 100) * 0.01;
      const fx = (dx/d)*f, fy = (dy/d)*f;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
    // 向心力 + 阻尼 + 边界
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.003;
      n.vy += (cy - n.y) * 0.003;
      n.vx *= 0.82; n.vy *= 0.82;
      n.x = Math.max(40, Math.min(W - 40, n.x + n.vx));
      n.y = Math.max(30, Math.min(H - 30, n.y + n.vy));
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const edges = ALL_EDGES.slice(0, revealedEdges);

    // 边
    for (const [i, j, w] of edges) {
      const a = nodes[i], b = nodes[j];
      ctx.strokeStyle = 'var(--accent2, #2a5fc8)';
      ctx.lineWidth   = w * 1.5;
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 节点
    for (const n of nodes) {
      ctx.fillStyle = 'var(--accent1, #c8432a)';
      ctx.beginPath(); ctx.arc(n.x, n.y, 9, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'var(--ink, #1a1410)'; ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle   = 'var(--ink, #1a1410)';
      ctx.font        = '15px "Noto Sans SC", sans-serif';
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(n.label, n.x, n.y - 13);
    }
  }

  function loop() { physics(); draw(); raf = requestAnimationFrame(loop); }
  loop();

  window.kgRevealEdge = function() {
    if (revealedEdges < ALL_EDGES.length) revealedEdges++;
    const btn = document.querySelector('.kg-btn');
    if (btn && revealedEdges >= ALL_EDGES.length) btn.textContent = '✓ 全部关系';
  };
})();
</script>
```

---

### 11.2 维恩图动画

```html
<!-- 用途：展示两个概念的交集、共性与独特性 -->
<!-- 认知目标：both/and 关系，而非 either/or -->
<div class="venn-stage">
  <div class="venn-wrap">
    <div class="venn-circle venn-left" id="vL">
      <span class="venn-label-inner">仅 A<br><small>独特属性</small></span>
    </div>
    <div class="venn-circle venn-right" id="vR">
      <span class="venn-label-inner">仅 B<br><small>独特属性</small></span>
    </div>
    <div class="venn-overlap" id="vO">共同<br>属性</div>
  </div>
  <div class="venn-titles">
    <span class="venn-title-l">概念 A</span>
    <span class="venn-title-r">概念 B</span>
  </div>
  <button onclick="runVenn()" style="margin-top:16px">▶ 演示</button>
</div>

<style>
.venn-stage   { display:flex; flex-direction:column; align-items:center; padding:40px 0; }
.venn-wrap    { position:relative; width:520px; height:240px; }
.venn-circle  {
  position:absolute; width:260px; height:240px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  opacity:0; transition:transform .8s cubic-bezier(.4,0,.2,1), opacity .5s;
}
.venn-left  { background:rgba(200,67,42,.18); border:3px solid var(--accent1,#c8432a);
              left:-20px; transform:translateX(-120px); }
.venn-right { background:rgba(42,95,200,.18); border:3px solid var(--accent2,#2a5fc8);
              right:-20px; transform:translateX(120px); }
.venn-circle.show  { opacity:1; transform:translateX(0); }
.venn-label-inner  { font-size:17px; text-align:center; padding:0 50px; }
.venn-overlap {
  position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
  font-size:18px; font-weight:700; text-align:center;
  color:var(--accent4,#2a8c4a);
  opacity:0; transition:opacity .6s .8s;
}
.venn-overlap.show { opacity:1; }
.venn-titles { display:flex; width:520px; justify-content:space-between; margin-top:8px; }
.venn-title-l { color:var(--accent1,#c8432a); font-weight:700; font-size:18px; }
.venn-title-r { color:var(--accent2,#2a5fc8); font-weight:700; font-size:18px; }
</style>

<script>
let vennStep = 0;
function runVenn() {
  vennStep++;
  if (vennStep === 1) document.getElementById('vL').classList.add('show');
  if (vennStep === 2) document.getElementById('vR').classList.add('show');
  if (vennStep === 3) document.getElementById('vO').classList.add('show');
  if (vennStep >= 3)  vennStep = 0; // 循环重置
}
</script>
```

---

### 11.3 因果链（多米诺效应）

```html
<!-- 用途：展示 A→B→C 的连锁因果 -->
<!-- 认知目标：因果不是静态箭头，而是力量的传递 -->
<div class="domino-stage">
  <div class="domino-track" id="dominoTrack">
    <!-- JS 动态生成 -->
  </div>
  <button onclick="triggerDomino()">▶ 触发</button>
</div>

<style>
.domino-stage   { display:flex; flex-direction:column; align-items:center; gap:20px; padding:40px; }
.domino-track   { display:flex; align-items:flex-end; gap:12px; height:160px; }
.domino-item    {
  display:flex; flex-direction:column; align-items:center; gap:8px;
}
.domino-tile    {
  width:38px; height:100px; border:2px solid var(--ink,#1a1410);
  background:var(--accent2,#2a5fc8); border-radius:3px;
  transform-origin: bottom center;
  transition:transform .35s cubic-bezier(.4,0,.2,1);
  box-shadow:3px 3px 0 var(--ink,#1a1410);
}
.domino-tile.fallen { transform:rotate(82deg) translateX(18px); }
.domino-label   { font-size:13px; text-align:center; max-width:60px; }
.domino-arrow   {
  align-self:center; font-size:22px; opacity:0;
  transition:opacity .3s; margin:0 -4px; padding-bottom:50px;
  color:var(--accent1,#c8432a);
}
.domino-arrow.show { opacity:1; }
</style>

<script>
(function() {
  // 替换为实际因果链
  const causes = ['政策变化', '资金减少', '项目缩减', '团队流失', '产品延期'];

  const track = document.getElementById('dominoTrack');
  causes.forEach((label, i) => {
    if (i > 0) {
      const arrow = document.createElement('div');
      arrow.className = 'domino-arrow';
      arrow.id = `dArrow${i}`;
      arrow.textContent = '→';
      track.appendChild(arrow);
    }
    const item = document.createElement('div');
    item.className = 'domino-item';
    item.innerHTML = `<div class="domino-tile" id="dTile${i}"></div>
                      <div class="domino-label">${label}</div>`;
    track.appendChild(item);
  });

  window.triggerDomino = function() {
    causes.forEach((_, i) => {
      setTimeout(() => {
        document.getElementById(`dTile${i}`).classList.add('fallen');
        if (i > 0) document.getElementById(`dArrow${i}`).classList.add('show');
      }, i * 320);
    });
    // 重置
    setTimeout(() => {
      document.querySelectorAll('.domino-tile').forEach(t => t.classList.remove('fallen'));
      document.querySelectorAll('.domino-arrow').forEach(a => a.classList.remove('show'));
    }, causes.length * 320 + 2000);
  };
})();
</script>
```

---

## § 12 叙事曲线动画

> **对应 PEDAGOGY §2.3 叙事性知识**：情绪曲线、场景构建、"那一刻"定格
> 认知目标：让学习者感受故事结构，而不只是记住事件顺序。

### 12.1 情绪 / 张力曲线

```html
<!-- 用途：可视化故事弧线，标注关键情节节点 -->
<!-- 认知目标：让叙事节奏变得具体可感，帮助学习者识别"在哪里" -->
<div class="arc-stage">
  <svg id="arcSvg" viewBox="0 0 800 260" preserveAspectRatio="xMidYMid meet">
    <!-- 纵轴标签 -->
    <text x="8" y="22" font-size="13" fill="currentColor" opacity=".5">紧张</text>
    <text x="8" y="246" font-size="13" fill="currentColor" opacity=".5">平静</text>

    <!-- 曲线路径（按情节定义控制点）-->
    <path id="arcPath"
      d="M 60,220 C 150,200 180,80 260,60 C 320,40 340,50 380,30
         C 440,10 480,90 520,110 C 580,140 640,200 740,220"
      fill="none" stroke="var(--accent1,#c8432a)" stroke-width="4"
      stroke-dasharray="1000" stroke-dashoffset="1000"
      style="transition:stroke-dashoffset 2s ease-in-out"/>

    <!-- 故事节点（data-step 控制出现顺序）-->
    <g id="arcNode0" opacity="0" style="transition:opacity .4s">
      <circle cx="60"  cy="220" r="8" fill="var(--accent2,#2a5fc8)"/>
      <text x="60" y="244" text-anchor="middle" font-size="13">设置</text>
    </g>
    <g id="arcNode1" opacity="0" style="transition:opacity .4s">
      <circle cx="260" cy="60"  r="8" fill="var(--accent2,#2a5fc8)"/>
      <text x="260" y="44" text-anchor="middle" font-size="13">冲突</text>
    </g>
    <g id="arcNode2" opacity="0" style="transition:opacity .4s">
      <circle cx="380" cy="30"  r="10" fill="var(--accent1,#c8432a)"/>
      <text x="380" y="14" text-anchor="middle" font-size="14" font-weight="700">高潮</text>
    </g>
    <g id="arcNode3" opacity="0" style="transition:opacity .4s">
      <circle cx="520" cy="110" r="8" fill="var(--accent2,#2a5fc8)"/>
      <text x="520" y="94" text-anchor="middle" font-size="13">转折</text>
    </g>
    <g id="arcNode4" opacity="0" style="transition:opacity .4s">
      <circle cx="740" cy="220" r="8" fill="var(--accent4,#2a8c4a)"/>
      <text x="740" y="244" text-anchor="middle" font-size="13">解决</text>
    </g>
  </svg>
  <button onclick="runArc()">▶ 展开故事弧</button>
</div>

<style>
.arc-stage { display:flex; flex-direction:column; align-items:center; gap:16px; }
.arc-stage svg { width:100%; max-width:800px; height:auto; }
</style>

<script>
let arcStep = 0;
function runArc() {
  if (arcStep === 0) {
    document.getElementById('arcPath').style.strokeDashoffset = '0';
    setTimeout(() => {
      for (let i = 0; i <= 4; i++) {
        setTimeout(() => {
          document.getElementById(`arcNode${i}`).style.opacity = '1';
        }, i * 350);
      }
    }, 1200);
  }
  arcStep++;
  if (arcStep > 4) {
    arcStep = 0;
    document.getElementById('arcPath').style.strokeDashoffset = '1000';
    for (let i = 0; i <= 4; i++)
      document.getElementById(`arcNode${i}`).style.opacity = '0';
  }
}
</script>
```

---

### 12.2 场景快速构建

```html
<!-- 用途：在讲概念前，用三步快速建立故事情境 -->
<!-- 认知目标：先建立"在哪里、是谁、发生什么"，让后续知识有落脚点 -->
<div class="scene-build">
  <!-- 第一步：时间/地点 badge -->
  <div class="scene-badge" data-step="1">📍 2019年·某高中课堂</div>

  <!-- 第二步：人物 -->
  <div class="scene-char" data-step="2">
    <div class="char-icon">👩‍🏫</div>
    <div class="char-name">李老师，教了20年数学</div>
  </div>

  <!-- 第三步：情境 -->
  <div class="scene-situation" data-step="3">
    第一次面对全班拿手机的学生，
    <strong>她不知道是管还是不管。</strong>
  </div>
</div>

<style>
.scene-build { display:flex; flex-direction:column; gap:24px; padding:40px; max-width:600px; }

.scene-badge {
  display:inline-block; background:var(--accent3,#e8a020); color:var(--ink,#1a1410);
  padding:8px 20px; border-radius:999px; font-size:18px; font-weight:700;
  border:2px solid var(--ink,#1a1410); box-shadow:3px 3px 0 var(--ink,#1a1410);
  opacity:0; transform:translateY(20px);
  transition:opacity .45s, transform .45s cubic-bezier(.2,1,.4,1);
}
.scene-char {
  display:flex; align-items:center; gap:16px;
  opacity:0; transform:translateX(-20px);
  transition:opacity .45s, transform .45s cubic-bezier(.2,1,.4,1);
}
.char-icon { font-size:48px; }
.char-name { font-size:20px; }
.scene-situation {
  font-size:22px; line-height:1.6;
  opacity:0; transform:translateY(15px);
  transition:opacity .5s, transform .5s cubic-bezier(.2,1,.4,1);
}
/* 激活状态 */
.scene-badge.on, .scene-char.on, .scene-situation.on {
  opacity:1; transform:none;
}
</style>

<script>
// 接入 SlideController 的 onReveal 或独立触发
let sceneStep = 0;
document.addEventListener('click', function sceneClick(e) {
  if (e.target.closest('[data-interactive]')) return;
  sceneStep++;
  const el = document.querySelector(`[data-step="${sceneStep}"]`);
  if (el) el.classList.add('on');
  if (sceneStep >= 3) document.removeEventListener('click', sceneClick);
});
</script>
```

---

### 12.3 转折定格（"那一刻"）

```html
<!-- 用途：单独一张 slide 放最重要的转折句 -->
<!-- 认知目标："这一刻很重要"的信号——背景暗下来，句子充满屏幕 -->
<div class="freeze-slide" id="freezeSlide" onclick="triggerFreeze()">
  <!-- 背景遮罩 -->
  <div class="freeze-vignette" id="freezeVignette"></div>

  <!-- 铺垫文字（点击前可见）-->
  <p class="freeze-prelude" id="freezePrelude">那次课上，李老师做了一个决定……</p>

  <!-- 定格句（点击后放大）-->
  <div class="freeze-phrase" id="freezePhrase">
    她把手机收走了，<br>然后用它播放了视频。
  </div>
</div>

<style>
.freeze-slide {
  position:relative; width:100%; height:100%;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; overflow:hidden;
}
.freeze-vignette {
  position:absolute; inset:0;
  background:radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0) 100%);
  transition:background 1s ease; pointer-events:none;
}
.freeze-vignette.on {
  background:radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.55) 100%);
}
.freeze-prelude {
  font-size:var(--size-body,26px); color:var(--ink,#1a1410);
  opacity:1; transition:opacity .4s; text-align:center;
}
.freeze-prelude.hidden { opacity:0; pointer-events:none; }
.freeze-phrase {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-family:var(--font-display,'Caveat',cursive);
  font-size:clamp(28px, 4.5vw, 84px); font-weight:700; line-height:1.3;
  text-align:center; padding:10%;
  color:var(--ink,#1a1410);
  transform:scale(.4); opacity:0;
  transition:transform .7s cubic-bezier(.2,.9,.3,1), opacity .6s;
}
.freeze-phrase.on { transform:scale(1); opacity:1; }
</style>

<script>
function triggerFreeze() {
  document.getElementById('freezePrelude').classList.add('hidden');
  document.getElementById('freezePhrase').classList.add('on');
  document.getElementById('freezeVignette').classList.add('on');
}
</script>
```

---

## § 13 元认知动画

> **对应 PEDAGOGY §2.5 元认知知识**：两种心态对比、思维过程外化、误区识别练习
> 认知目标：让学习者"看见"自己的思维方式，并主动对比和调整。

### 13.1 两种心态并排

```html
<!-- 用途：对比"固定型思维 vs 成长型思维"，或任意两种认知模式 -->
<!-- 认知目标：心理过程可视化——让无形的思维方式变得可观察、可比较 -->
<div class="mindset-stage">
  <div class="mindset-panel ms-left" data-step="1">
    <div class="ms-label">旧思维 ✗</div>
    <div class="ms-anim-wrap">
      <!-- 线性路径：直线前进，遇障碍停止 -->
      <svg viewBox="0 0 200 80">
        <line x1="20" y1="40" x2="160" y2="40" stroke="var(--accent1,#c8432a)" stroke-width="3" stroke-dasharray="6 3"/>
        <rect x="155" y="24" width="20" height="32" rx="3" fill="var(--accent1,#c8432a)" opacity=".4"/>
        <circle class="ms-dot-old" cx="20" cy="40" r="7" fill="var(--accent1,#c8432a)"/>
      </svg>
    </div>
    <div class="ms-desc">遇到困难 → 放弃</div>
  </div>

  <div class="ms-vs">VS</div>

  <div class="mindset-panel ms-right" data-step="2">
    <div class="ms-label">新思维 ✓</div>
    <div class="ms-anim-wrap">
      <!-- 螺旋迭代路径 -->
      <svg viewBox="0 0 200 80">
        <path d="M20,40 Q60,10 100,40 Q140,70 180,40"
              fill="none" stroke="var(--accent4,#2a8c4a)" stroke-width="3" stroke-dasharray="4 2"/>
        <circle class="ms-dot-new" cx="20" cy="40" r="7" fill="var(--accent4,#2a8c4a)"/>
      </svg>
    </div>
    <div class="ms-desc">遇到困难 → 换路径 → 继续</div>
  </div>
</div>

<style>
.mindset-stage {
  display:flex; align-items:center; justify-content:center;
  gap:24px; padding:40px; flex-wrap:wrap;
}
.mindset-panel {
  flex:0 0 280px; padding:28px 24px;
  border:2px solid var(--ink,#1a1410); border-radius:6px;
  background:var(--card-bg,#fff); box-shadow:5px 5px 0 var(--ink,#1a1410);
  opacity:0; transform:translateY(20px);
  transition:opacity .5s, transform .5s cubic-bezier(.2,1,.4,1);
}
.mindset-panel.on { opacity:1; transform:none; }
.ms-label { font-weight:700; font-size:20px; margin-bottom:12px; }
.ms-left .ms-label  { color:var(--accent1,#c8432a); }
.ms-right .ms-label { color:var(--accent4,#2a8c4a); }
.ms-anim-wrap svg { width:100%; height:auto; }
.ms-desc { font-size:15px; margin-top:10px; text-align:center; opacity:.8; }
.ms-vs { font-size:28px; font-weight:700; opacity:.4; }

/* 旧思维：dot 走到墙壁然后停 */
.ms-dot-old { animation:oldDot 3s ease-in-out infinite; }
@keyframes oldDot {
  0%   { transform:translateX(0); }
  60%  { transform:translateX(130px); }
  70%  { transform:translateX(125px); }
  100% { transform:translateX(125px); opacity:0.3; }
}
/* 新思维：dot 沿曲线往复 */
.ms-dot-new { animation:newDot 3s ease-in-out infinite; }
@keyframes newDot {
  0%   { transform:translateX(0)   translateY(0); }
  25%  { transform:translateX(80px) translateY(-30px); }
  50%  { transform:translateX(160px) translateY(0); }
  75%  { transform:translateX(80px) translateY(-30px); }
  100% { transform:translateX(0)   translateY(0); }
}
</style>

<script>
let msStep = 0;
document.addEventListener('click', function msClick(e) {
  if (e.target.closest('[data-interactive]')) return;
  msStep++;
  const el = document.querySelector(`.mindset-panel[data-step="${msStep}"]`);
  if (el) el.classList.add('on');
});
</script>
```

---

### 13.2 思维气泡序列（自我提问）

```html
<!-- 用途：外化学习者应该在脑中进行的元认知对话 -->
<!-- 认知目标：示范"好的思考者会问什么"，帮助学习者内化提问习惯 -->
<div class="bubble-seq" id="bubbleSeq">
  <!-- JS 动态生成 -->
</div>
<button onclick="nextBubble()">下一个问题 →</button>

<style>
.bubble-seq { display:flex; flex-direction:column; gap:20px; max-width:560px; }

.thought-bubble {
  position:relative; background:var(--card-bg,#fff);
  border:2px solid var(--ink,#1a1410); border-radius:20px;
  padding:16px 22px; font-size:20px; line-height:1.5;
  box-shadow:4px 4px 0 var(--ink,#1a1410);
  opacity:0; transform:translateY(-16px) scale(.95);
  transition:opacity .4s cubic-bezier(.2,1,.4,1),
             transform .4s cubic-bezier(.2,1,.4,1);
}
/* 气泡尾巴 */
.thought-bubble::after {
  content:''; position:absolute; bottom:-14px; left:28px;
  width:12px; height:14px;
  background:var(--card-bg,#fff);
  border-right:2px solid var(--ink,#1a1410);
  border-bottom:2px solid var(--ink,#1a1410);
  clip-path:polygon(0 0,100% 0,50% 100%);
}
.thought-bubble.on {
  opacity:1; transform:none;
}
/* 入场时的轻微弹动 */
.thought-bubble.on { animation:bubblePop .5s cubic-bezier(.2,1,.4,1); }
@keyframes bubblePop {
  0%   { transform:scale(.95) translateY(-12px); }
  60%  { transform:scale(1.03); }
  100% { transform:scale(1); }
}
</style>

<script>
// 替换为与课程内容匹配的元认知问题
const QUESTIONS = [
  '我真的理解了这个概念，还是只是记住了定义？',
  '我能用自己的话解释吗？',
  '这个例子符合定义，还是只是"看起来像"？',
  '我的理解和原来的想法有什么不同？',
];
let bubbleIdx = 0;

const seq = document.getElementById('bubbleSeq');
QUESTIONS.forEach(q => {
  const div = document.createElement('div');
  div.className = 'thought-bubble';
  div.textContent = q;
  seq.appendChild(div);
});

window.nextBubble = function() {
  const bubbles = seq.querySelectorAll('.thought-bubble');
  if (bubbleIdx < bubbles.length) {
    bubbles[bubbleIdx].classList.add('on');
    bubbleIdx++;
  } else {
    bubbles.forEach(b => b.classList.remove('on'));
    bubbleIdx = 0;
  }
};
</script>
```

---

### 13.3 先猜后揭示（检索练习）

```html
<!-- 用途：让学习者先做判断，再看答案——比直接告知记忆效果强 2-3× -->
<!-- 认知目标：检索练习效应（Roediger & Karpicke） -->
<div class="quiz-stage" id="quizStage">
  <!-- 情境描述 -->
  <div class="quiz-scenario">
    老师把课堂目标写在黑板上，讲完课后学生抄下来。
    <br><strong>这降低了哪种认知负荷？</strong>
  </div>

  <!-- 选项区 -->
  <div class="quiz-choices" id="quizChoices">
    <button class="quiz-btn" onclick="checkAnswer(this, false)">内在负荷</button>
    <button class="quiz-btn" onclick="checkAnswer(this, true)">外在负荷</button>
    <button class="quiz-btn" onclick="checkAnswer(this, false)">生成负荷</button>
  </div>

  <!-- 解析（点击后出现）-->
  <div class="quiz-explain" id="quizExplain">
    ✓ <strong>外在负荷</strong>：写黑板消除了"记住要学什么"的额外努力，
    这不属于内容本身的难度（内在），也不是主动建构理解（生成）。
  </div>
</div>

<style>
.quiz-stage    { display:flex; flex-direction:column; gap:24px; max-width:600px; padding:40px; }
.quiz-scenario { font-size:20px; line-height:1.6; }
.quiz-choices  { display:flex; gap:14px; flex-wrap:wrap; }
.quiz-btn {
  padding:14px 28px; font-size:18px;
  border:2px solid var(--ink,#1a1410); border-radius:6px;
  background:var(--card-bg,#fff); cursor:pointer;
  box-shadow:3px 3px 0 var(--ink,#1a1410);
  transition:background .4s, color .4s, transform .15s;
}
.quiz-btn:hover:not(:disabled) { transform:translateY(-2px); }
.quiz-btn.correct { background:var(--accent4,#2a8c4a); color:#fff; border-color:var(--accent4,#2a8c4a); }
.quiz-btn.wrong   { background:var(--accent1,#c8432a); color:#fff; border-color:var(--accent1,#c8432a); opacity:.6; }
.quiz-explain {
  font-size:18px; line-height:1.6; padding:18px 22px;
  background:rgba(42,140,74,.08); border:2px solid var(--accent4,#2a8c4a);
  border-radius:6px;
  opacity:0; transform:translateY(10px);
  transition:opacity .4s, transform .4s;
}
.quiz-explain.show { opacity:1; transform:none; }
</style>

<script>
function checkAnswer(btn, isCorrect) {
  // 禁用所有按钮
  document.querySelectorAll('.quiz-btn').forEach(b => {
    b.disabled = true;
    b.classList.add(b === btn ? (isCorrect ? 'correct' : 'wrong') : 'wrong');
    // 标出正确答案
    if (!isCorrect) {
      document.querySelectorAll('.quiz-btn').forEach(b2 => {
        if (b2.onclick && b2.onclick.toString().includes('true')) b2.classList.add('correct');
      });
    }
  });
  document.getElementById('quizExplain').classList.add('show');
}
</script>
```

---

## § 14 环境背景效果

> **用途**：为封面、身份转变、情绪钩子类 slide 提供动态背景。
> **原则**：背景永远服务内容，不竞争注意力。前景文字需有足够对比度。
> **使用方式**：在 `SlideController.onEnter` 里启动，下一张 slide 进入时调用 `.stop()` 清除。

---

### 14.1 星群连线背景

```html
<!-- 用途：抽象"关系"、"网络"、"思想连接"的视觉隐喻 -->
<!-- 适合：手绘创意、学术简约主题；封面、概念导入 slide -->
<div class="bg-canvas-wrap" id="constellationBg"></div>

<style>
.bg-canvas-wrap {
  position:absolute; inset:0; overflow:hidden; pointer-events:none;
}
</style>

<script>
function makeConstellation(container, accentColor) {
  const c = document.createElement('canvas');
  c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  container.appendChild(c);
  const ctx = c.getContext('2d');
  const color = accentColor || getComputedStyle(document.documentElement)
                                .getPropertyValue('--accent2').trim() || '#2a5fc8';

  let W, H, pts = [], raf;
  const N = 60, LINK_DIST = 140;

  function resize() {
    const r = container.getBoundingClientRect();
    W = r.width; H = r.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = (W * dpr) | 0; c.height = (H * dpr) | 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pts = Array.from({length: N}, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * 0.4,
      vy: (Math.random() - .5) * 0.4,
    }));
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function loop() {
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    }
    for (let i = 0; i < N; i++) {
      for (let j = i+1; j < N; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < LINK_DIST) {
          ctx.globalAlpha = (1 - d / LINK_DIST) * 0.4;
          ctx.strokeStyle = color; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = color;
    for (const p of pts) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(loop);
  }
  loop();

  return {
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      c.remove();
    }
  };
}

// 使用示例（在 onEnter 钩子里）
// const fx = makeConstellation(document.getElementById('constellationBg'));
// ctrl.onEnter = (idx) => { if (idx === 2) { if (fx) fx.stop(); } };
</script>
```

---

### 14.2 渐变色团漂移

```html
<!-- 用途：为封面、身份认同型、情绪转折 slide 提供深色氛围背景 -->
<!-- 适合：深色极简、纯动画概念主题 -->
<div class="blob-bg-wrap" id="blobBg"
     style="position:absolute;inset:0;overflow:hidden;pointer-events:none;background:#0a0c16;">
</div>

<script>
function makeGradientBlobs(container) {
  const c = document.createElement('canvas');
  c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  container.appendChild(c);
  const ctx = c.getContext('2d');

  // 从 CSS 变量读取主题色，回退到默认
  const root = document.documentElement;
  const cs   = getComputedStyle(root);
  const COLORS = [
    cs.getPropertyValue('--accent1').trim() || '#c8432a',
    cs.getPropertyValue('--accent2').trim() || '#2a5fc8',
    cs.getPropertyValue('--accent3').trim() || '#e8a020',
    cs.getPropertyValue('--accent5').trim() || '#6b3fa0',
  ];

  let W, H, raf;
  const blobs = COLORS.map((hex, i) => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - .5) * 0.06,
    vy: (Math.random() - .5) * 0.06,
    r: 200 + Math.random() * 180,
    hex
  }));

  function hexToRgb(hex) {
    const m = hex.replace('#','').match(/.{2}/g);
    return m ? m.map(x => parseInt(x, 16)) : [124,92,255];
  }

  function resize() {
    const r = container.getBoundingClientRect();
    W = r.width; H = r.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = (W * dpr) | 0; c.height = (H * dpr) | 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  let t0 = performance.now();
  function loop(now) {
    const t = (now - t0) / 1000;
    ctx.fillStyle = 'rgba(10,12,22,0.18)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      b.x += b.vx * 0.01; b.y += b.vy * 0.01;
      if (b.x < 0 || b.x > 1) b.vx *= -1;
      if (b.y < 0 || b.y > 1) b.vy *= -1;
      const px = b.x * W, py = b.y * H;
      const r  = b.r + Math.sin(t * 0.7 + b.x * 5) * 28;
      const [R, G, B] = hexToRgb(b.hex);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
      grad.addColorStop(0, `rgba(${R},${G},${B},0.5)`);
      grad.addColorStop(1, `rgba(${R},${G},${B},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return {
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      c.remove();
    }
  };
}
</script>
```

---

### 14.3 磁力流线

```html
<!-- 用途：可视化"影响力传播"、"无形力量"、"扩散效应" -->
<!-- 适合：历史演化、社会影响、传播机制类 slide -->
<div class="magfield-wrap" id="magFieldBg"
     style="position:absolute;inset:0;overflow:hidden;pointer-events:none;">
</div>

<script>
function makeMagneticField(container) {
  const c = document.createElement('canvas');
  c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  container.appendChild(c);
  const ctx = c.getContext('2d');

  const cs = getComputedStyle(document.documentElement);
  const PALETTE = [
    cs.getPropertyValue('--accent1').trim() || '#c8432a',
    cs.getPropertyValue('--accent2').trim() || '#2a5fc8',
    cs.getPropertyValue('--accent3').trim() || '#e8a020',
    cs.getPropertyValue('--accent4').trim() || '#2a8c4a',
  ];

  let W, H, raf;
  const N = 40;
  const parts = Array.from({length: N}, (_, i) => ({
    phase: Math.random() * Math.PI * 2,
    freq:  0.4 + Math.random() * 0.8,
    amp:   30  + Math.random() * 70,
    y0:    0.15 + Math.random() * 0.7,
    c:     PALETTE[i % PALETTE.length],
    trail: [],
  }));

  function resize() {
    const r = container.getBoundingClientRect();
    W = r.width; H = r.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = (W * dpr) | 0; c.height = (H * dpr) | 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts.forEach(p => { p.trail = []; });
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  let t0 = performance.now();
  function loop(now) {
    const t = (now - t0) / 1000;
    ctx.fillStyle = 'rgba(245,240,232,0.06)';
    ctx.fillRect(0, 0, W, H);
    for (const p of parts) {
      const x = ((t * 70 + p.phase * 50) % (W + 100)) - 50;
      const y = H * p.y0 + Math.sin(x * 0.018 + p.phase + t * p.freq) * p.amp;
      p.trail.push([x, y]);
      if (p.trail.length > 20) p.trail.shift();
      ctx.strokeStyle = p.c;
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      p.trail.forEach(([tx, ty], i) => i === 0 ? ctx.moveTo(tx, ty) : ctx.lineTo(tx, ty));
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return {
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      c.remove();
    }
  };
}
</script>
```

---

## § 15 升级版全局工具

> 生产质量工具，可用于任何 HTML slide 的动画实现。

### 15.1 DPR 感知 Canvas 工具

```javascript
/**
 * makeCanvas(container) — 创建一个自适应 DPR 和容器大小的 Canvas
 * 返回 { ctx, get w, get h, destroy() }
 *
 * 用法：
 *   const k = makeCanvas(document.getElementById('mySlide'));
 *   const stop = (() => {
 *     let raf;
 *     function loop() { k.ctx.clearRect(0,0,k.w,k.h); /* 绘制 */ raf = requestAnimationFrame(loop); }
 *     loop();
 *     return () => cancelAnimationFrame(raf);
 *   })();
 *   // 离开 slide 时：stop(); k.destroy();
 */
function makeCanvas(container) {
  if (getComputedStyle(container).position === 'static')
    container.style.position = 'relative';

  const c   = document.createElement('canvas');
  c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;';
  container.appendChild(c);

  const ctx = c.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = 1, h = 1;

  function fit() {
    const r = container.getBoundingClientRect();
    w = Math.max(1, r.width  | 0);
    h = Math.max(1, r.height | 0);
    c.width  = (w * dpr) | 0;
    c.height = (h * dpr) | 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(container);

  return {
    c, ctx, dpr,
    get w() { return w; },
    get h() { return h; },
    destroy() {
      try { ro.disconnect(); } catch(_) {}
      c.remove();
    }
  };
}

// rand 辅助（简化 canvas 动画中的随机数）
const rand = (a, b) => a + Math.random() * (b - a);
```

---

### 15.2 3D 悬停倾斜（TiltCard）

```javascript
/**
 * TiltCard — 为任何卡片元素添加 3D 鼠标跟随倾斜效果
 * 适用：对比卡片（§3）、框架象限（§6）、数据卡片
 *
 * 用法：
 *   document.querySelectorAll('.card').forEach(el => new TiltCard(el));
 */
class TiltCard {
  constructor(el, options = {}) {
    this.el = el;
    this.maxTilt  = options.maxTilt  ?? 12;   // 最大倾斜角度（度）
    this.scale    = options.scale    ?? 1.03;  // 悬停时缩放
    this.perspective = options.perspective ?? 900;

    el.style.willChange = 'transform';
    el.style.transition = 'transform .08s linear';
    el.addEventListener('mousemove',  this._onMove.bind(this));
    el.addEventListener('mouseleave', this._onLeave.bind(this));
  }

  _onMove(e) {
    const r  = this.el.getBoundingClientRect();
    const x  = (e.clientX - r.left)  / r.width  - 0.5;  // -0.5 ~ 0.5
    const y  = (e.clientY - r.top)   / r.height - 0.5;
    this.el.style.transform =
      `perspective(${this.perspective}px) ` +
      `rotateY(${x * this.maxTilt}deg) ` +
      `rotateX(${-y * this.maxTilt}deg) ` +
      `scale(${this.scale})`;
  }

  _onLeave() {
    this.el.style.transition = 'transform .5s cubic-bezier(.2,1,.4,1)';
    this.el.style.transform  = '';
    // 恢复快速响应
    setTimeout(() => { this.el.style.transition = 'transform .08s linear'; }, 500);
  }

  destroy() {
    this.el.removeEventListener('mousemove',  this._onMove);
    this.el.removeEventListener('mouseleave', this._onLeave);
    this.el.style.willChange = '';
    this.el.style.transform  = '';
  }
}
```

---

### 15.3 导出清理模式说明

> 已在 `FORMATS.md §4` 修复。此处记录模式要点，方便在自定义导出函数中复用。

```javascript
// 导出 HTML 前后的标准清理 / 恢复模式
function exportClean(filename = 'slides.html') {
  // 1. 收集并清除所有编辑状态
  const editables = [...document.querySelectorAll('[contenteditable]')];
  editables.forEach(el => el.removeAttribute('contenteditable'));
  document.querySelectorAll('.editable').forEach(el => el.style.outline = 'none');
  const wasInEditMode = document.body.classList.contains('edit-active');
  document.body.classList.remove('edit-active');

  // 2. 捕获干净的 HTML（无编辑痕迹）
  const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  const blob = new Blob([html], {type: 'text/html'});
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: filename
  });
  a.click();

  // 3. 恢复编辑状态（用户可以继续编辑）
  if (wasInEditMode) {
    document.body.classList.add('edit-active');
    editables.forEach(el => el.setAttribute('contenteditable', 'true'));
    document.querySelectorAll('.editable').forEach(el => {
      el.style.outline = '2px dashed var(--accent3)';
    });
  }
}
```
