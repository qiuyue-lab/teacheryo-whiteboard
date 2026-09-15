# FORMATS.md — 画布与格式规范

> 在 Step 4（设计决策）和 Step 5（生成 HTML）时读取。

---

## 一、画布系统

### 五种标准画布

| 格式 | 尺寸 | 用途 | 字号乘数 |
|------|------|------|----------|
| **横版标准** | 1920×1080 | 视频/投影/大屏 | ×1.0 |
| **横版轻量** | 1280×720  | 网页/小屏分享 | ×0.7 |
| **竖版全屏** | 1080×1920 | 手机竖屏视频 | ×1.2 |
| **小红书4:5**| 1080×1350 | 小红书最优比例 | ×1.1 |
| **方图**     | 1080×1080 | 微信/Instagram | ×1.0 |

### 统一缩放 JS（必须包含）

```javascript
function scaleCanvas() {
  const deck = document.getElementById('deck');
  const W = parseInt(deck.dataset.w) || 1920;
  const H = parseInt(deck.dataset.h) || 1080;
  const scaleX = window.innerWidth  / W;
  const scaleY = window.innerHeight / H;
  const scale  = Math.min(scaleX, scaleY);
  const ml = (window.innerWidth  - W * scale) / 2;
  const mt = (window.innerHeight - H * scale) / 2;
  deck.style.cssText = `
    width:${W}px; height:${H}px;
    transform:scale(${scale});
    transform-origin:top left;
    margin-left:${ml}px;
    margin-top:${mt}px;
  `;
}
window.addEventListener('resize', scaleCanvas);
scaleCanvas();
```

### 竖版布局规则

竖版（手机/小红书）时，layout 调整：
- 左右分栏 → 改为上下排列
- 卡片矩阵：3列 → 1列或2列
- 流程图：横向 → 纵向
- 字号比横版大 20%（`--size-body` × 1.2）
- 重要内容集中在屏幕上半部分（手机下半段被拇指遮挡）

```css
/* 竖版专用补丁（在1080×1920画布内）*/
@media (max-aspect-ratio: 1/1) {
  .layout-split { flex-direction: column; }
  .col-text, .col-visual { flex: none; width: 100%; }
  .card-grid { grid-template-columns: 1fr 1fr; }
  .flow-nodes { flex-direction: column; }
  .flow-conn { width: 3px; height: 80px; }
}
```

---

## 二、响应式字号（clamp 系统）

**不要用固定 px，用 clamp() 让字号随画布自适应：**

```css
:root {
  /* 横版标准（1920px 基准）→ clamp(最小, 理想vw, 最大) */
  --size-hero:    clamp(48px, 5.5vw, 120px);
  --size-display: clamp(40px, 4.5vw, 104px);
  --size-h1:      clamp(24px, 2.7vw, 56px);
  --size-h2:      clamp(18px, 1.9vw, 40px);
  --size-body:    clamp(14px, 1.35vw, 28px);
  --size-label:   clamp(11px, 0.9vw, 18px);
  --size-caption: clamp(9px,  0.7vw, 14px);

  /* 间距 */
  --gap-sm:  clamp(8px,  0.8vw,  16px);
  --gap-md:  clamp(16px, 1.7vw,  32px);
  --gap-lg:  clamp(32px, 3.3vw,  64px);
  --pad-slide: clamp(40px, 4.2vw, 80px);
}

/* 卡片约束 */
.card, .card-wrap {
  max-width: min(90%, 800px);
  max-height: min(80vh, 600px);
}

/* 图片约束 */
img, .img-slot {
  max-width: 100%;
  max-height: min(50vh, 500px);
  object-fit: contain;
}
```

---

## 三、导航系统标准实现

```javascript
// 完整导航控制器
class SlideController {
  constructor() {
    this.slides  = [...document.querySelectorAll('.slide')];
    this.cur     = 0;
    this.stepIdx = 0;
    this.progBar = document.getElementById('prog');
    this.init();
  }

  stepsOf(slide) {
    return [...slide.querySelectorAll('[data-step]')]
      .sort((a,b) => +a.dataset.step - +b.dataset.step);
  }

  goto(n) {
    this.slides[this.cur].classList.remove('active');
    this.cur = Math.max(0, Math.min(n, this.slides.length - 1));
    this.stepIdx = 0;
    const slide = this.slides[this.cur];
    slide.classList.add('active');
    this.stepsOf(slide).forEach(el => el.classList.remove('on'));
    this.updateProgress();
    this.onEnter(this.cur);
  }

  advance() {
    const steps = this.stepsOf(this.slides[this.cur]);
    if (this.stepIdx < steps.length) {
      const el = steps[this.stepIdx];
      el.classList.add('on');
      this.onReveal(this.cur, this.stepIdx, el);
      this.stepIdx++;
    } else if (this.cur < this.slides.length - 1) {
      this.goto(this.cur + 1);
    }
  }

  retreat() { if (this.cur > 0) this.goto(this.cur - 1); }

  updateProgress() {
    if (this.progBar)
      this.progBar.style.width = ((this.cur + 1) / this.slides.length * 100) + '%';
  }

  onEnter(idx)  { /* 子类或内联覆盖 */ }
  onReveal(slideIdx, stepIdx, el) { /* 子类或内联覆盖 */ }

  init() {
    // 键盘
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); this.advance(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); this.retreat(); }
      if (e.key === 'f') document.documentElement.requestFullscreen?.();
    });
    // 点击（排除交互元素）
    document.addEventListener('click', e => {
      if (e.target.closest('[data-interactive], button, a, input, select')) return;
      this.advance();
    });
    // 触屏滑动
    let tx = 0;
    document.addEventListener('touchstart', e => { tx = e.touches[0].clientX; });
    document.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 50) { dx < 0 ? this.advance() : this.retreat(); }
    });
    // 初始化
    this.updateProgress();
  }
}

// 使用
const ctrl = new SlideController();
// 覆盖钩子
ctrl.onReveal = (slide, step, el) => {
  // 可在这里触发特定动画
};
```

---

## 四、浏览器内联编辑

```html
<!-- 在 slide 上加 contenteditable，允许用户直接修改文字 -->
<div class="editable-wrap" id="editWrap" style="display:none">
  <button onclick="toggleEdit()">✏️ 编辑模式</button>
  <button onclick="exportHTML()">⬇️ 导出</button>
</div>

<script>
let editMode = false;
function toggleEdit() {
  editMode = !editMode;
  document.querySelectorAll('.editable').forEach(el => {
    el.contentEditable = editMode ? 'true' : 'false';
    el.style.outline = editMode ? '2px dashed var(--accent3)' : 'none';
  });
}

function exportHTML() {
  // Strip edit state so saved file opens cleanly (not stuck in edit mode)
  const editables = [...document.querySelectorAll('[contenteditable]')];
  editables.forEach(el => el.removeAttribute('contenteditable'));
  document.querySelectorAll('.editable').forEach(el => el.style.outline = 'none');

  const html = `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
  const blob  = new Blob([html], {type:'text/html'});
  const a     = document.createElement('a');
  a.href      = URL.createObjectURL(blob);
  a.download  = 'slides-edited.html';
  a.click();

  // Restore edit state so user can keep editing
  if (editMode) {
    editables.forEach(el => el.setAttribute('contenteditable', 'true'));
    document.querySelectorAll('.editable').forEach(el => {
      el.style.outline = '2px dashed var(--accent3)';
    });
  }
}

// 显示编辑工具栏（可选：按 E 键触发）
document.addEventListener('keydown', e => {
  if (e.key === 'e') {
    document.getElementById('editWrap').style.display = 'block';
  }
});
</script>

<style>
#editWrap {
  position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
  background:var(--ink); color:var(--cream);
  padding:10px 20px; border-radius:999px; z-index:999;
  display:flex; gap:12px;
}
#editWrap button {
  background:none; border:1px solid rgba(255,255,255,.3);
  color:inherit; padding:6px 16px; border-radius:999px;
  cursor:pointer; font-size:14px;
}
#editWrap button:hover { background:rgba(255,255,255,.1); }
[contenteditable="true"] { outline:2px dashed var(--accent3) !important; }
</style>
```

---

## 五、内容类型 × Slide 序列模板

### 微课（知识点，8-12 张）

```
S01 · 封面 → 钩子句 + 一句话"你将学到什么"
S02 · 先验激活 → "你以前是怎么想这个问题的？"（制造认知张力）
S03 · 核心概念 → 定义 + 类比动画
S04 · 机制/原理 → 过程动画（让不可见变可见）
S05 · 正例 → 具体案例（故事型或场景型）
S06 · 反例/边界 → "这种情况不适用，因为…"
S07 · 常见误区 → Before/After 翻转
S08 · 总结 → 3个关键词 + 一句金句
S09 · Quiz → "你来判断：这是哪种情况？"
S10 · 延伸/下期 → CTA
```

### 线上讲座（15-20 张）

```
S01 · 封面
S02 · 讲师简介（30秒版本）
S03 · 今天的议程（3-4个节点，动画展开）
S04 · 破冰/共情（"你是不是也…"）
S05-14 · 正文（每个主题：概念+案例+要点，3张一组）
S15 · 核心结论（结论先行，3条）
S16 · 你现在可以做的第一件事
S17 · Q&A 引导
S18 · 资源/延伸阅读
S19 · CTA + 联系方式
```

### 口播/社媒（5-8 张）

```
S01 · 封面 → 钩子句（强到让人停下来）
S02 · 共情 → "你是不是也遇到过这个…"
S03 · 核心洞察 → 反差或解包（最重要的一张）
S04 · 证据/案例 → 让洞察可信
S05 · 具体做法 → 可操作，有行动感
S06 · 金句收尾
S07 · CTA → 关注/收藏/评论引导
```

### 报告（10-15 张）

```
S01 · 封面 → 最重要的结论（结论先行！）
S02 · 背景 → 为什么这个问题重要
S03 · 方法论 → 一张，简洁
S04-10 · 主要发现 → 每个发现独立一张，数据+解读
S11 · 综合分析 → 发现之间的关系
S12 · 建议 → 3条，有优先级
S13 · 风险/限制 → 诚实，建立信任
S14 · 下一步
S15 · 附录入口
```

---

## 六、性能规范

- 动画用 `transform` 和 `opacity`，不用 `top/left/width/height`（避免重排）
- Canvas 动画加 `will-change:transform`
- 粒子系统粒子数：移动端 ≤ 30，桌面 ≤ 100
- 重型动画加 `@media (prefers-reduced-motion)` 降级处理
- 字体用 `font-display:swap` 避免 FOUT

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```
