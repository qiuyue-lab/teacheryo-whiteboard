/* ============================================================
 * TeacherYO · 公共：类型元信息 + 工具 + 结果渲染器（前后端共用）
 * ============================================================ */
window.TY = window.TY || {};

const TYPES = {
  rollcall: { name: '随机点名', icon: '🎯', tip: '学生先报名，再随机点人 / 分组', c: '#6D28D9' },
  notes:    { name: '便签墙', icon: '🟨', tip: '自由表达，贴出你的想法', c: '#B45309' },
  choice:   { name: '选择题', icon: '🗳️', tip: '点选作答，大屏实时出图', c: '#0F766E' },
  blank:    { name: '填空题', icon: '✏️', tip: '开放式短回答', c: '#075985' },
  cloud:    { name: '词云',   icon: '☁️', tip: '一两个词，汇聚成云', c: '#9D174D' },
  material: { name: '材料学习', icon: '📎', tip: '先看材料，再答配套问题', c: '#1D4A22' }
};
const TY_NOTE_COLORS = {
  yellow:  { bg: '#FFE08A', fg: '#7A5300' },
  red:     { bg: '#FFB3A8', fg: '#8A1E14' },
  green:   { bg: '#A8D5A2', fg: '#1D4A22' },
  blue:    { bg: '#A8CBE8', fg: '#17456E' },
  purple:  { bg: '#D8C6E8', fg: '#4A2C66' }
};
const EMOJIS = ['📘', '📚', '🧪', '🎤', '🎨', '🧠', '💡', '🌍', '🧮', '🎮', '🎬', '🌱'];
/* 便签形状：颜色之外的第二维度区分度 */
const NOTE_SHAPES = [
  { k: 'square', name: '方形', icon: '▢' },
  { k: 'round',  name: '圆形', icon: '◯' },
  { k: 'pill',   name: '胶囊', icon: '⬭' },
  { k: 'tag',    name: '标签', icon: '🏷' }
];

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const fmtTime = (t) => {
  if (!t) return '';
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`;
};
function txtRows(v) { return String(v || '').split('\n').map((s) => s.trim()).filter(Boolean); }
/* 6 位课堂码显示成「482 391」的分组形式 */
const fmtCode = (c) => String(c || '').trim().replace(/(\d{3})(?=\d)/g, '$1 ');

/* 把一个互动转成「题单元」列表：
 * plain  单题（选择/填空/词云）
 * notes  便签墙 → 每个问题一个单元
 * parts  材料学习 → 每个配套问题一个单元
 */
function noteAnchorLabels(cfg) {
  // 中心关键词锚点：优先新字段 anchors，兼容旧字段 questions
  if (cfg.anchors && cfg.anchors.length) return cfg.anchors.map((a) => (typeof a === 'string' ? a : a.label)).filter(Boolean);
  if (cfg.questions && cfg.questions.length) return cfg.questions;
  return [];
}
function layoutAnchors(labels) {
  // 自动布局：锚点横向均分布于画布上方，多时错落成两行
  const n = labels.length;
  if (!n) return [];
  return labels.map((label, i) => {
    const row = Math.floor(i / 5);               // 每行最多 5 个
    const col = i % 5;
    const inRow = Math.min(5, n - row * 5);
    const x = inRow === 1 ? 0.5 : 0.14 + (0.72 * col / (inRow - 1));
    const y = 0.2 + row * 0.2;
    return { id: 'a' + i, label, x, y };
  });
}
function boardUnits(b) {
  const cfg = b.config || {};
  const out = { units: [], meta: null };
  if (b.type === 'notes') {
    // 中心关键词：默认自动布局，若老师拖动过则用已保存的位置
    const saved = {};
    (cfg.anchors || []).forEach((a) => { if (a && a.id) saved[a.id] = a; });
    const anchors = layoutAnchors(noteAnchorLabels(cfg)).map((a) => {
      const s = saved[a.id];
      return (s && typeof s.x === 'number' && typeof s.y === 'number')
        ? Object.assign({}, a, { x: s.x, y: s.y }) : a;
    });
    out.units = [{ kind: 'notes', qIdx: 0, title: '', subType: 'note', anchors }];
    out.meta = { note: true, anchors };
  } else if (b.type === 'rollcall') {
    // 随机点名：整场只有「一个名册单元」，学生报名进池，老师随时抽人 / 分组
    out.units = [{ kind: 'roster', qIdx: 0, title: cfg.question || '', subType: 'signin' }];
    out.meta = { roster: true };
  } else if (b.type === 'material') {
    const parts = cfg.parts || [];
    out.meta = { material: cfg.material || { kind: 'article', title: '材料', url: '', desc: '' } };
    out.units = parts.map((p, i) => ({ kind: 'part', qIdx: i, title: p.question, subType: p.ptype, options: p.options || [], multi: !!p.multi }));
  } else {
    out.units = [{ kind: 'plain', qIdx: 0, title: cfg.question || '', subType: b.type, options: cfg.options || [], multi: !!cfg.multi }];
  }
  return out;
}
/* 某单元对应的提交（已按类型/part过滤） */
function subsOf(rows, u) {
  const expectType = (u.subType === 'note') ? 'note' : u.subType;
  return (rows || []).filter((s) => s.type === expectType && s.part_idx === u.qIdx);
}

/* ---------- 渲染器：把一组 submission 画进 el ---------- */
/* opts.mySel（可选）：我自己选的序号数组（学生端用来标「你的选择」）。
 * 老师端不传 → 画出来的东西和以前一模一样。 */
function renderChoice(holder, unit, rows, opts) {
  const mySel = (opts && opts.mySel) || [];
  const totalRows = rows.filter((r) => Array.isArray(r.data.sel)).length;
  const base = Math.max(totalRows, 1);
  holder.innerHTML = '';
  (unit.options || []).forEach((opt, i) => {
    const picked = rows.filter((r) => Array.isArray(r.data.sel) && r.data.sel.includes(i));
    const cn = picked.length;
    const pct = Math.round((cn / base) * 100);
    const isMine = mySel.indexOf(i) >= 0;
    const d = document.createElement('div'); d.className = 'opt-bar' + (isMine ? ' mine' : '');
    const chips = cn > 0
      ? `<div class="ob-pickers">${picked.map((r) => `<span class="picker-chip" title="${fmtTime(r.created_at)}">${esc(r.author)}</span>`).join('')}</div>`
      : '';
    d.innerHTML = `<div class="ob-fill" style="width:${pct}%"></div>
      <div class="ob-row"><span>${String.fromCharCode(65 + i)}. ${esc(opt)}${isMine ? '<span class="ob-mine">你的选择</span>' : ''}</span><span class="ob-pct">${cn > 0 ? pct + '%' : ''}</span></div>
      <div class="ob-count">${cn} 人选择${unit.multi ? '（多选）' : ''}</div>
      ${chips}`;
    holder.appendChild(d);
  });
  const m = document.createElement('div'); m.className = 'side-note'; m.style.cssText = 'text-align:right;margin-top:4px';
  m.textContent = `共 ${totalRows} 人作答`;
  holder.appendChild(m);
}
function renderBlank(holder, unit, rows) {
  holder.innerHTML = '';
  if (!rows.length) { holder.innerHTML = '<div class="side-note" style="padding:18px 0;text-align:center">还没有回答，等学生提交…</div>'; return; }
  const g = document.createElement('div'); g.className = 'ans-grid';
  [...rows].sort((a, b) => (b.created_at || 0) - (a.created_at || 0)).forEach((r) => {
    const it = document.createElement('div'); it.className = 'ans-item';
    it.innerHTML = `<div class="a-author">${esc(r.author)}<small>${fmtTime(r.created_at)}</small></div><div class="a-text">${esc(r.data.text)}</div>`;
    g.appendChild(it);
  });
  holder.appendChild(g);
}
function renderCloud(holder, unit, rows) {
  holder.innerHTML = '';
  if (!rows.length) { holder.innerHTML = '<div class="side-note" style="padding:22px 0;text-align:center">还没有词，等学生提交…</div>'; return; }
  const freq = {};
  rows.forEach((r) => { const k = String(r.data.text || '').trim(); if (k) freq[k] = (freq[k] || 0) + 1; });
  const items = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const max = items.length ? items[0][1] : 1;
  const pal = ['#EA580C', '#0F766E', '#075985', '#9D174D', '#B45309', '#1D4A22', '#6D28D9'];
  const box = document.createElement('div'); box.className = 'cloud-box';
  items.forEach(([w, cn], i) => {
    const s = document.createElement('span'); s.className = 'cloud-w';
    s.style.fontSize = (16 + Math.round((cn / max) * 30)) + 'px';
    s.style.color = pal[i % pal.length]; s.style.opacity = cn === 1 ? '.6' : '1';
    s.textContent = w; s.title = `${cn} 人提到`;
    box.appendChild(s);
  });
  holder.appendChild(box);
}
/* ---------- 随机点名 · 名册 ----------
 * 名单来源就是普通的 submissions 行：type='signin'、author=名字、data.name=名字。
 * 刻意不新增表、不新增 TY.db.* 接口 —— 复用已有的 listSubmissions / submit /
 * removeSubmission，所以本地模式和云端模式都不用改数据层。
 *
 * 去重规则：**按名字去重**，同名的以最新那条为准。
 * 为什么不用 uid 去重？本地模式下整台浏览器共用一个 uid（store.local.js 的
 * currentUid 存在 localStorage 里），用 uid 去重会把「一台电脑演示多个学生」
 * 全合并成一个人，功能在本地直接失效。课堂上「名字」本来就是点名的身份，
 * 所以按名字去重；同名同学会被合并成一条，属于已知取舍（见 AGENTS.md）。
 */
function rosterItems(rows) {
  const map = {};
  const order = [];
  (rows || []).slice().sort((a, b) => (a.created_at || 0) - (b.created_at || 0)).forEach((r) => {
    if (!r || r.type !== 'signin') return;
    const name = signinName(r);
    if (!name) return;
    if (!(name in map)) order.push(name);
    map[name] = { id: r.id, uid: r.uid || '', name, created_at: r.created_at, sub: r };
  });
  return order.map((n) => map[n]);
}
function rosterNames(rows) { return rosterItems(rows).map((x) => x.name); }
/* 一行 signin 提交对应的「名字」。名册去重、移除名册里的人等地方都用它，
 * 保证「同一个名字」在所有地方是同一个口径（前后空格/连续空格先归一）。 */
function signinName(row) {
  return String((row && row.data && row.data.name) || (row && row.author) || '').replace(/\s+/g, ' ').trim();
}
/* 名册渲染器：学生端 / 老师端 / 下发弹窗三处共用 */
function renderRoster(holder, unit, rows, opts) {
  opts = opts || {};
  const items = rosterItems(rows);
  holder.innerHTML = '';
  if (!items.length) {
    holder.innerHTML = '<div class="side-note" style="padding:18px 0;text-align:center">还没有人报名，等学生扫码填名字…</div>';
    return;
  }
  const box = document.createElement('div');
  box.className = 'rc-roster';
  items.forEach((it) => {
    const c = document.createElement('span');
    c.className = 'rc-chip';
    c.innerHTML = '<span class="rc-avatar">' + esc(it.name.slice(0, 1)) + '</span><span class="rc-nm">' + esc(it.name) + '</span>'
      + (opts.canDel ? '<button type="button" class="rc-del" data-id="' + esc(it.id) + '" title="把这个人从名册里移除">✕</button>' : '');
    box.appendChild(c);
  });
  holder.appendChild(box);
  if (opts.canDel) {
    box.querySelectorAll('.rc-del').forEach((b) => {
      b.addEventListener('click', () => { if (opts.onDel) opts.onDel(b.dataset.id); });
    });
  }
}
function noteRot(seed) {
  // 确定性微旋转：基于种子（author+id）生成 -2.5 ~ +2.5 度的旋转
  const h = String(seed).split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return ((h % 51) - 25) / 10; // -2.5 ~ +2.5
}
function clamp01(v) { return Math.max(0, Math.min(1, Number(v) || 0)); }
function clampNum(v, a, b) { const n = Number(v); return Math.max(a, Math.min(b, isNaN(n) ? a : n)); }

/* ---------- 无限白板：世界坐标系统 ----------
 * 世界坐标：便签/锚点在「无限平面」上的像素位置 —— 原点在基准区左上角，
 *          可以是负数、也可以远超基准区。这是「真无限」的关键：
 *          位置不再被归一化到 0~1，所以便签能贴到任意远的地方。
 * 画布坐标：世界坐标 + NC_ORIGIN，把原点挪到画布正中，负坐标也画得出来。
 * 兼容历史数据：只存了归一化 x/y（0-1）的旧便签，按基准区尺寸换算成世界坐标。
 */
const NC_BASE_W = 1560;             // 历史归一化坐标的换算基准宽
const NC_BASE_H = 1080;             // 历史归一化坐标的换算基准高
const NC_ORIGIN = 12000;            // 世界原点在画布内的偏移
const NC_EXTENT = NC_ORIGIN * 2;    // 画布边长（足够大 ≈ 无限）
const toCvX = (wx) => wx + NC_ORIGIN;
const toCvY = (wy) => wy + NC_ORIGIN;
/* 一个便签的世界坐标：优先新字段 px/py，其次旧归一化 x/y，最后确定性散点 */
function noteWorldPos(n, idx, total) {
  const d = (n && n.data) || {};
  if (typeof d.px === 'number' && typeof d.py === 'number') return { x: d.px, y: d.py };
  if (typeof d.x === 'number' && typeof d.y === 'number') return { x: d.x * NC_BASE_W, y: d.y * NC_BASE_H };
  const s = noteSeedPos(n && n.id, idx || 0, total || 10);
  return { x: s.x * NC_BASE_W, y: s.y * NC_BASE_H };
}
/* 锚点（中心关键词）的世界坐标：config 里存的仍是归一化 x/y */
function anchorWorldPos(a) {
  const x = (typeof a.x === 'number') ? a.x : 0.5;
  const y = (typeof a.y === 'number') ? a.y : 0.2;
  return { x: x * NC_BASE_W, y: y * NC_BASE_H };
}
/* 黄金角散点：低差异序列，天然铺开、几乎不扎堆（同样输入结果稳定） */
function goldenSpot(i, total) {
  const G = 2.399963229728653;
  const rr = Math.sqrt((i + 0.5) / Math.max(total, 1));
  const x = 0.5 + rr * Math.cos(i * G) * 0.44;
  const y = 0.5 + rr * Math.sin(i * G) * 0.44;
  return { x: clamp01(x), y: clamp01(y) };
}
function noteSeedPos(id, idx, total) {
  const s = goldenSpot(idx || 0, total || 10);
  const h = String(id || idx).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return { x: clamp01(s.x + ((h % 13) - 6) / 220), y: clamp01(s.y + (((h >> 4) % 13) - 6) / 220) };
}
/* 找「最空」的落点：从视口中心向外做黄金角搜索，挑离已有便签最远的点。
 * 返回**世界坐标**（不再归一化），所以便签能贴到基准区之外的任意地方。
 * box（可选）：{w,h} 当前可视区的世界尺寸，{nw,nh} 这张便签的尺寸。给了就把落点夹在
 * 可视区内 —— 否则搜索会一路往外跑，便签虽然「不扎堆」却贴到了屏幕外，学生看不到自己那张。
 * 注意 px/py 是便签的**左上角**（渲染时就是按左上角定位的），所以夹的范围是
 * [-半边, +半边 - 便签自身尺寸]，不能当成中心对称地夹。 */
function clampSpan(v, lo, hi) { return (hi < lo) ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)); }
function findFreeSpot(rows, center, box) {
  const pts = (rows || []).filter((r) => r && r.data).map((r) => noteWorldPos(r));
  const cx = (center && typeof center.x === 'number') ? center.x : NC_BASE_W / 2;
  const cy = (center && typeof center.y === 'number') ? center.y : NC_BASE_H / 2;
  const hw = (box && box.w) ? box.w / 2 : Infinity;          // 可视区半宽（世界像素）
  const hh = (box && box.h) ? box.h / 2 : Infinity;
  const nw = (box && box.nw) || 190;                          // 便签自身尺寸
  const nh = (box && box.nh) || 170;
  const GAP = 200;                      // 期望的最小间距（世界像素）
  let best = { x: cx, y: cy }, bestD = -1;
  for (let i = 0; i < 200; i++) {
    const ang = i * 2.399963229728653;  // 黄金角
    const rad = 95 + 54 * Math.sqrt(i);
    const ox = clampSpan(Math.cos(ang) * rad * 1.5, -hw, hw - nw);
    const oy = clampSpan(Math.sin(ang) * rad, -hh, hh - nh);
    const c = { x: cx + ox, y: cy + oy };
    if (!pts.length) return c;
    let d = Infinity;
    for (let j = 0; j < pts.length; j++) {
      const dx = pts[j].x - c.x, dy = (pts[j].y - c.y) * 0.9;
      const v = dx * dx + dy * dy;
      if (v < d) d = v;
    }
    const jitter = Math.random() * 40;
    if (d + jitter > bestD) { bestD = d + jitter; best = c; }
    if (d >= GAP * GAP) return c;       // 已经够空，收工
  }
  return best;
}
/* 自动整理：返回 [{id,x,y}]（**世界坐标**），供白板一键排布
 *
 * ⚠️ 便签墙 UI 目前只暴露「👍 按点赞排序」这一个动作（2026-09-17 起）。
 *    其余 mode 的实现保留着 —— 想恢复只需在 index.html 的整理条里加回按钮，
 *    不需要动这里（`time` 走的是和 `like` 同一段网格代码，只是排序键不同）。
 *
 * box（可选）：当前视口的**世界尺寸**（{w,h}，已按缩放折算），由 viewport.__worldSize() 给。
 *   不给就退回按 1560×1080 基准区铺 —— 这正是一开始「点了整理像没反应」的原因：
 *   网格是围着基准区算的，而老师眼前的视口可能比基准区窄/矮，排完便签落在视野上方之外。 */
function arrangeLayout(mode, rows, anchors, center, box) {
  const list = (rows || []).filter((r) => r && r.data);
  const out = [];
  const put = (id, x, y) => out.push({ id, x, y });
  if (!list.length) return out;
  const cx = (center && typeof center.x === 'number') ? center.x : NC_BASE_W / 2;
  const cy = (center && typeof center.y === 'number') ? center.y : NC_BASE_H / 2;
  const LEFT = cx - NC_BASE_W / 2 + 110;
  const RIGHT = cx + NC_BASE_W / 2 - 110;
  const TOP = cy - NC_BASE_H / 2 + 130;
  const GAPY = 200;
  if (mode === 'like' || mode === 'time') {
    const arr = [...list].sort((a, b) => mode === 'like'
      ? ((b.likes || 0) - (a.likes || 0))
      : ((a.created_at || 0) - (b.created_at || 0)));
    /* 铺成「从上到下、从左到右」的规整网格，并且**让它正好铺满当前可视区**：
     *  - 格子尺寸按便签实际宽度放宽，避免宽便签互相压住；
     *  - 列数取「网格长宽比最接近可视区长宽比」的那个 → 排完不用缩放就看得全；
     *  - 整块网格以视口中心为中心对称摆放 → 不会像以前那样偏到视野上方。
     * 排完 index.html 还会调一次 __fitContent() 兜底（内容超出时自动缩小到看得见）。 */
    const n = arr.length;
    const bw = (box && box.w) || NC_BASE_W;
    const bh = (box && box.h) || NC_BASE_H;
    const maxW = arr.reduce((m, r) => Math.max(m, clampNum((r.data && r.data.w) || 170, 90, 560)), 170);
    const CW = Math.max(200, maxW + 34);        // 单格宽（含横向间距）
    const CH = 220;                             // 单格高（含纵向间距）
    let bestCols = 1, bestScore = Infinity;
    for (let c = 1; c <= n; c++) {
      const rw = c * CW, rh = Math.ceil(n / c) * CH;
      const score = Math.abs(Math.log((rw / rh) / (bw / bh)));   // 长宽比越接近越小
      if (score < bestScore - 1e-9) { bestScore = score; bestCols = c; }
    }
    const rowsN = Math.ceil(n / bestCols);
    const left = cx - (bestCols * CW) / 2 + 17;   // +17：便签在格子里的左边距
    const top = cy - (rowsN * CH) / 2 + 17;
    arr.forEach((r, i) => put(r.id, left + (i % bestCols) * CW, top + Math.floor(i / bestCols) * CH));
  } else if (mode === 'color' || mode === 'shape') {
    const keyOf = (r) => mode === 'color' ? (r.data.color || 'yellow') : (r.data.shape || 'square');
    const keys = [];
    list.forEach((r) => { const k = keyOf(r); if (keys.indexOf(k) < 0) keys.push(k); });
    const bandW = (RIGHT - LEFT) / keys.length;
    keys.forEach((k, bi) => {
      list.filter((r) => keyOf(r) === k).forEach((r, i) => {
        put(r.id, LEFT + bi * bandW + (i % 2) * (bandW / 2.2), TOP + Math.floor(i / 2) * GAPY);
      });
    });
  } else if (mode === 'anchor' && anchors && anchors.length) {
    const aw = anchors.map((a) => ({ label: a.label, p: anchorWorldPos(a) }));
    const buckets = aw.map(() => []);
    const other = [];
    list.forEach((r) => {
      const t = String(r.data.text || '');
      const hit = aw.findIndex((a) => a.label && t.indexOf(a.label) >= 0);
      (hit >= 0 ? buckets[hit] : other).push(r);
    });
    const place = (arr, ax, ay) => arr.forEach((r, i) => {
      const ring = Math.floor(i / 7) + 1;
      const ang = (i % 7) / 7 * Math.PI * 2 + ring * 0.9;
      const rad = 150 * ring;
      put(r.id, ax + Math.cos(ang) * rad * 1.6, ay + Math.sin(ang) * rad + 110);
    });
    aw.forEach((a, i) => place(buckets[i], a.p.x, a.p.y));
    if (other.length) place(other, cx, cy + NC_BASE_H / 2);
  } else {
    list.forEach((r, i) => { const s = noteSeedPos(r.id, i, list.length); put(r.id, s.x * NC_BASE_W, s.y * NC_BASE_H); });
  }
  return out;
}
function makeDraggable(el, canvas, onMove) {
  let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.note-like') || e.target.closest('.note-del') || e.target.closest('.note-resize')) return;
    dragging = true;
    el.classList.add('dragging');
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    startX = e.clientX; startY = e.clientY;
    origLeft = el.offsetLeft; origTop = el.offsetTop;
    TY._ncBusy = true;
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const z = canvas.__z || 1;
    let left = origLeft + (e.clientX - startX) / z;
    let top = origTop + (e.clientY - startY) / z;
    left = Math.max(0, Math.min(canvas.offsetWidth - el.offsetWidth, left));
    top = Math.max(0, Math.min(canvas.offsetHeight - el.offsetHeight, top));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('dragging');
    TY._ncBusy = false;
    if (onMove) onMove(el.dataset.id, el.offsetLeft - NC_ORIGIN, el.offsetTop - NC_ORIGIN);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
/* 锚点（中心关键词）拖拽：老师端可自己摆关键词的位置 */
function makeAnchorDraggable(el, canvas, onMove) {
  let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    el.classList.add('dragging');
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    startX = e.clientX; startY = e.clientY;
    origLeft = el.offsetLeft; origTop = el.offsetTop;
    TY._ncBusy = true;
    e.preventDefault(); e.stopPropagation();
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const z = canvas.__z || 1;
    let left = origLeft + (e.clientX - startX) / z;
    let top = origTop + (e.clientY - startY) / z;
    left = Math.max(0, Math.min(canvas.offsetWidth - el.offsetWidth, left));
    top = Math.max(0, Math.min(canvas.offsetHeight - el.offsetHeight, top));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('dragging');
    TY._ncBusy = false;
    if (onMove) onMove(el.dataset.id, el.offsetLeft - NC_ORIGIN, el.offsetTop - NC_ORIGIN);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
function makeResizable(el, onResize) {
  const handle = el.querySelector('.note-resize');
  if (!handle) return;
  let resizing = false, startX = 0, origW = 0;
  handle.addEventListener('pointerdown', (e) => {
    resizing = true;
    el.classList.add('resizing');
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    startX = e.clientX; origW = el.offsetWidth;
    TY._ncBusy = true;
    e.preventDefault(); e.stopPropagation();
  });
  handle.addEventListener('pointermove', (e) => {
    if (!resizing) return;
    const z = (el.closest('.note-canvas') || {}).__z || 1;
    const w = clampNum(origW + (e.clientX - startX) / z, 90, 560);
    el.style.width = w + 'px';
  });
  const end = () => {
    if (!resizing) return;
    resizing = false;
    el.classList.remove('resizing');
    TY._ncBusy = false;
    if (onResize) onResize(el.dataset.id, el.offsetWidth);
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}
/* 无限画布：视图状态（缩放/平移）按 viewKey 跨轮询保留 */
TY._ncViews = TY._ncViews || {};
/* 视口中心对应的世界坐标（每次重绘刷新）—— 新便签落点用它，保证贴在你眼前 */
TY._ncCenter = TY._ncCenter || {};
/* 视口对应的世界尺寸（宽/高，已按缩放折算）—— 整理网格按它铺，见 arrangeLayout */
TY._ncSize = TY._ncSize || {};
TY._ncCenterLast = TY._ncCenterLast || null;
TY._ncBusy = false;
/* 白板内正在输入/拖拽时，页面轮询应跳过重绘，避免打断操作 */
TY.noteUiBusy = function () {
  if (TY._ncBusy) return true;
  if (document.querySelector('.note-dock-wrap.open')) return true;   // 贴便签面板开着，别刷掉
  const a = document.activeElement;
  if (a && a.closest && a.closest('.note-dock')) return true;
  return false;
};
/* 全屏白板：把白板铺满整屏，只留白板内容（Esc 或 ⤡ 退出） */
TY.toggleNoteFull = function (viewport, force) {
  if (!viewport) return;
  const already = viewport.classList.contains('is-full');
  const on = (typeof force === 'boolean') ? force : !already;
  const key = viewport.dataset.viewKey || 'default';
  const parent = viewport.parentElement;
  // 进入时从卡片里找整理条；退出时用之前记下的元素引用（不能存容器，否则 insertBefore 会撞层级异常）
  const bar = on ? (viewport.__barEl || (parent && parent.querySelector('.note-arrange'))) : viewport.__barEl;
  const st = viewport.__viewState ? viewport.__viewState() : null;
  // 状态真的切换了才重新定位。若已经是目标状态（轮询重绘后同步全屏 UI），
  // 重新定位会拿「卡片尺寸」算中心、再按「全屏尺寸」落位，每轮累计偏移 —— 就是「一直往右下角跳」的根因。
  const changed = (already !== on);

  viewport.classList.toggle('is-full', on);
  if (document.documentElement) document.documentElement.classList.toggle('nc-full-lock', on);
  TY._ncFullKeys = TY._ncFullKeys || {};
  if (on) TY._ncFullKeys[key] = true; else delete TY._ncFullKeys[key];

  // 整理条：全屏时搬进白板当浮层，退出时归位到卡片顶部
  try {
    if (on && bar && !viewport.contains(bar)) {
      viewport.__barEl = bar;
      viewport.__barHome = bar.parentElement;
      bar.classList.add('full-float');
      viewport.appendChild(bar);
    } else if (!on && bar && viewport.__barHome && viewport.contains(bar)) {
      bar.classList.remove('full-float');
      viewport.__barHome.insertBefore(bar, viewport.__barHome.firstChild);
      viewport.__barHome = null;
    }
  } catch (err) { /* 归位失败不影响全屏本身 */ }

  const btn = viewport.querySelector('[data-nc="full"]');
  if (btn) {
    btn.textContent = on ? '⤡' : '⛶';
    btn.title = on ? '退出全屏（Esc）' : '全屏白板（只留白板）';
  }
  // 视口尺寸变了，按原来的中心点重新定位，避免内容跑丢（仅状态切换时做一次）
  if (changed) setTimeout(() => { if (st && viewport.__zoomTo) viewport.__zoomTo(st.cx, st.cy, st.z); }, 60);
};
TY.setupInfiniteCanvas = function (viewport, canvas, opts) {
  const key = (opts && opts.viewKey) || 'default';
  const st = TY._ncViews[key] || (TY._ncViews[key] = { z: 1, tx: 0, ty: 0, ready: false });
  const MINZ = 0.3, MAXZ = 3.2;
  const label = viewport.querySelector('.nc-zoom-label');
  const apply = () => {
    canvas.style.transformOrigin = '0 0';
    canvas.style.transform = 'translate(' + Math.round(st.tx) + 'px,' + Math.round(st.ty) + 'px) scale(' + st.z + ')';
    canvas.__z = st.z;
    if (label) label.textContent = Math.round(st.z * 100) + '%';
    // 网格背景跟着平移/缩放走 → 视觉上无限延伸，不再有「一块白板」的边界
    const g = Math.max(9, 26 * st.z);
    viewport.style.backgroundSize = g + 'px ' + g + 'px';
    viewport.style.backgroundPosition = (st.tx % g) + 'px ' + (st.ty % g) + 'px';
    // 视口中心对应的世界坐标：新便签就落在你眼前
    TY._ncCenter[key] = {
      x: (viewport.clientWidth / 2 - st.tx) / st.z - NC_ORIGIN,
      y: (viewport.clientHeight / 2 - st.ty) / st.z - NC_ORIGIN
    };
    TY._ncCenterLast = TY._ncCenter[key];
    // 视口对应的世界尺寸：「一键整理」按它算网格，排完才正好落在你看得见的地方
    TY._ncSize[key] = { w: viewport.clientWidth / st.z, h: viewport.clientHeight / st.z };
  };
  const clampPan = () => {
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    if (!vw || !vh) return;             // 还没进 DOM（宽高为 0）时别动，等下一帧重算
    // 画布大到近乎无限，只需保证它不完全滑出视口，其余完全自由
    const cw = canvas.offsetWidth * st.z, ch = canvas.offsetHeight * st.z;
    const pad = 140;
    st.tx = Math.min(vw - pad, Math.max(pad - cw, st.tx));
    st.ty = Math.min(vh - pad, Math.max(pad - ch, st.ty));
  };
  const zoomAt = (cx, cy, factor) => {
    const r = viewport.getBoundingClientRect();
    const px = (cx - r.left - st.tx) / st.z;
    const py = (cy - r.top - st.ty) / st.z;
    st.z = clampNum(st.z * factor, MINZ, MAXZ);
    st.tx = (cx - r.left) - px * st.z;
    st.ty = (cy - r.top) - py * st.z;
    clampPan(); apply();
  };
  const fit = () => {
    // 「适应」= 把所有便签/锚点框进视口（不再是把固定画布缩到视口里）
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const bb = canvas.__bbox || { x: NC_ORIGIN + NC_BASE_W * 0.12, y: NC_ORIGIN + NC_BASE_H * 0.12, w: NC_BASE_W * 0.76, h: NC_BASE_H * 0.7 };
    st.z = clampNum(Math.min(vw / Math.max(bb.w, 120), vh / Math.max(bb.h, 120)) * 0.96, MINZ, MAXZ);
    st.tx = vw / 2 - (bb.x + bb.w / 2) * st.z;
    st.ty = vh / 2 - (bb.y + bb.h / 2) * st.z;
    clampPan(); apply();
  };
  if (!st.ready && viewport.clientWidth > 0) {
    // 初始：把「基准区」（历史归一化坐标所在的 1560×1080 区域）居中显示
    st.z = 1;
    st.tx = Math.round(viewport.clientWidth / 2 - (NC_ORIGIN + NC_BASE_W / 2) * st.z);
    st.ty = Math.round(viewport.clientHeight / 2 - (NC_ORIGIN + NC_BASE_H / 2) * st.z);
    st.ready = true;
  }
  clampPan(); apply();

  if (!viewport.__wired) {
    viewport.__wired = true;
    // Esc 退出全屏白板（全局只绑一次）
    if (!window.__ncFullEsc) {
      window.__ncFullEsc = true;
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' && e.key !== 'Esc') return;
        document.querySelectorAll('.note-viewport.is-full').forEach((v) => TY.toggleNoteFull(v, false));
      });
    }
    viewport.querySelectorAll('[data-nc]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = viewport.getBoundingClientRect();
        const k = btn.dataset.nc;
        if (k === 'in') zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.2);
        else if (k === 'out') zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.2);
        else if (k === 'full') TY.toggleNoteFull(viewport);
        else if (k === 'fit') fit();
      });
    });
    let panning = false, sx = 0, sy = 0, ox = 0, oy = 0;
    viewport.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.note-mini') || e.target.closest('.note-anchor') || e.target.closest('.note-toolbar') || e.target.closest('.note-dock-wrap')) return;
      panning = true;
      viewport.classList.add('panning');
      sx = e.clientX; sy = e.clientY; ox = st.tx; oy = st.ty;
      try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
      TY._ncBusy = true;
      e.preventDefault();
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!panning) return;
      st.tx = ox + (e.clientX - sx);
      st.ty = oy + (e.clientY - sy);
      clampPan(); apply();
    });
    const pend = () => {
      if (!panning) return;
      panning = false;
      viewport.classList.remove('panning');
      TY._ncBusy = false;
    };
    viewport.addEventListener('pointerup', pend);
    viewport.addEventListener('pointercancel', pend);
    // Ctrl/⌘ + 滚轮（触控板双指捏合）缩放
    viewport.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.1 : 1 / 1.1);
    }, { passive: false });
    // 触屏双指捏合
    const tpts = new Map();
    let pinchD = 0;
    viewport.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      tpts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (tpts.size > 1) { panning = false; viewport.classList.remove('panning'); }
    });
    viewport.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'touch' || !tpts.has(e.pointerId)) return;
      tpts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const arr = Array.from(tpts.values());
      if (arr.length < 2) return;
      const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      if (pinchD) zoomAt((arr[0].x + arr[1].x) / 2, (arr[0].y + arr[1].y) / 2, d / pinchD);
      pinchD = d;
    });
    const tend = (e) => { tpts.delete(e.pointerId); pinchD = 0; };
    viewport.addEventListener('pointerup', tend);
    viewport.addEventListener('pointercancel', tend);
  }
  viewport.__viewState = () => ({
    z: st.z,
    cx: ((viewport.clientWidth / 2 - st.tx) / st.z) / (canvas.offsetWidth || 1),
    cy: ((viewport.clientHeight / 2 - st.ty) / st.z) / (canvas.offsetHeight || 1)
  });
  viewport.__zoomTo = (x, y, z) => {
    st.z = clampNum(z, MINZ, MAXZ);
    st.tx = viewport.clientWidth / 2 - x * canvas.offsetWidth * st.z;
    st.ty = viewport.clientHeight / 2 - y * canvas.offsetHeight * st.z;
    clampPan(); apply();
  };
  viewport.__resetView = () => {
    st.ready = false; st.z = 1;
    st.tx = Math.round(viewport.clientWidth / 2 - (NC_ORIGIN + NC_BASE_W / 2));
    st.ty = Math.round(viewport.clientHeight / 2 - (NC_ORIGIN + NC_BASE_H / 2));
    st.ready = true; clampPan(); apply();
  };
  /* 「适应内容」：一键把所有便签框进视口（整理完 / 迷路时用） */
  viewport.__fitContent = fit;
  /* 当前视口中心的世界坐标 —— 新增便签的落点参考 */
  viewport.__worldCenter = () => TY._ncCenter[key] || null;
  /* 当前视口的世界尺寸 —— 「一键整理」用它决定铺几列，排完便签正好在视野内 */
  viewport.__worldSize = () => TY._ncSize[key] || null;
};
function renderNotes(holder, unit, rows, opts) {
  // 便签墙：无限自由白板 —— 可缩放平移 + 中心关键词锚点 + 便签自由摆放/缩放/换形状
  opts = opts || {};
  const anchors = unit.anchors || [];
  holder.innerHTML = '';

  const viewport = document.createElement('div');
  viewport.className = 'note-viewport';
  const canvas = document.createElement('div');
  canvas.className = 'note-canvas' + (opts.draggable ? ' is-draggable' : '');
  const tb = document.createElement('div');
  tb.className = 'note-toolbar';
  tb.innerHTML = '<button type="button" class="nc-btn" data-nc="out" title="缩小">−</button>'
    + '<span class="nc-zoom-label">100%</span>'
    + '<button type="button" class="nc-btn" data-nc="in" title="放大">＋</button>'
    + '<button type="button" class="nc-btn nc-fit" data-nc="fit" title="适应画布">⤢</button>'
    + (opts.fullscreen === false ? '' : '<button type="button" class="nc-btn nc-full" data-nc="full" title="全屏白板（只留白板）">⛶</button>');
  viewport.appendChild(canvas);
  viewport.appendChild(tb);
  holder.appendChild(viewport);

  // 逻辑画布：一张「无限大」的平面，世界原点落在画布正中 —— 正负坐标都画得出来
  canvas.style.width = NC_EXTENT + 'px';
  canvas.style.height = NC_EXTENT + 'px';

  // 中心关键词锚点（老师端可拖拽预设位置）
  anchors.forEach((a, i) => {
    const el = document.createElement('div');
    el.className = 'note-anchor' + (opts.anchorEditable ? ' editable' : '');
    const ap = anchorWorldPos(a);
    el.style.left = Math.round(toCvX(ap.x)) + 'px';
    el.style.top = Math.round(toCvY(ap.y)) + 'px';
    el.textContent = a.label;
    el.dataset.id = a.id || ('a' + i);
    canvas.appendChild(el);
    if (opts.anchorEditable) makeAnchorDraggable(el, canvas, opts.onAnchorMove);
  });

  // 便签
  const total = rows.length;
  rows.forEach((n, idx) => {
    const d = n.data || {};
    const c = TY_NOTE_COLORS[d.color] || TY_NOTE_COLORS.yellow;
    const pos = noteWorldPos(n, idx, total);   // 世界坐标：可为负、可远超基准区
    const shape = NOTE_SHAPES.some((s) => s.k === d.shape) ? d.shape : 'square';
    const r = noteRot(n.author + (n.id || ''));
    const w = clampNum(d.w || 170, 90, 560);
    const isTeacher = (d.role === 'teacher');
    const el = document.createElement('div');
    el.className = 'note-mini note-free ns-' + shape + (isTeacher ? ' is-teacher' : '');
    el.style.background = c.bg; el.style.color = c.fg;
    el.style.left = Math.round(toCvX(pos.x)) + 'px';
    el.style.top = Math.round(toCvY(pos.y)) + 'px';
    el.style.width = w + 'px';
    el.style.transform = 'rotate(' + r.toFixed(1) + 'deg)';
    el.dataset.id = n.id;
    const delBtn = opts.canDel ? '<span class="note-del" data-id="' + n.id + '" title="删除">✕</span>' : '';
    const handle = opts.resizable ? '<span class="note-resize" title="拖动调整大小"></span>' : '';
    const avatar = isTeacher ? '<span class="note-avatar">👩🏻‍🏫</span>' : '';
    const badge = isTeacher ? '<span class="note-tbadge">老师</span>' : '';
    const img = d.img ? '<div class="note-img"><img src="' + esc(d.img) + '" alt="便签图片" loading="lazy"></div>' : '';
    el.innerHTML = '<div class="note-author-row"><span class="na-name">' + avatar + esc(n.author) + badge + '</span>' + delBtn + '</div>'
      + img
      + (d.text ? '<div class="note-body">' + esc(d.text) + '</div>' : '')
      + '<div class="note-foot">'
      + '<span class="note-like ' + ((n.liked_by && n.liked_by.length) ? 'on' : '') + '" data-id="' + n.id + '">👍 <b>' + (n.likes || 0) + '</b></span>'
      + '<span class="note-time">' + fmtTime(n.created_at) + '</span></div>' + handle;
    canvas.appendChild(el);
    if (opts.draggable) makeDraggable(el, canvas, opts.onMove);
    if (opts.resizable) makeResizable(el, opts.onResize);
  });

  if (!rows.length && !anchors.length) {
    const h = document.createElement('div');
    h.className = 'note-empty-hint';
    h.textContent = '无限白板已就绪 · 便签贴上来会落在这里，可拖动、可缩放、可换形状';
    viewport.appendChild(h);
  }

  // 全屏状态跨轮询保留：上一轮是全屏的，重绘后自动回到全屏
  const keepKey = opts.viewKey || 'default';
  viewport.dataset.viewKey = keepKey;
  // 关键：上一轮处于全屏时，必须「先」把新视口标记成全屏（尺寸立即变成整屏），再做任何定位计算。
  // 否则会先按卡片宽度算中心、切全屏后又按整屏宽度落位，每轮轮询固定偏移半个宽度差，
  // 表现为「画布一直往右下角跳，永不停」。同步标记后，__viewState/__zoomTo 的视口尺寸始终一致。
  TY._ncFullKeys = TY._ncFullKeys || {};
  const wasFull = !!TY._ncFullKeys[keepKey] && opts.fullscreen !== false;
  if (wasFull) {
    viewport.classList.add('is-full');
    if (document.documentElement) document.documentElement.classList.add('nc-full-lock');
    const fb = viewport.querySelector('[data-nc="full"]');
    if (fb) { fb.textContent = '⤡'; fb.title = '退出全屏（Esc）'; }
  }

  /* 整理条（只有老师端传 opts.arrangeBar）：**必须在这里同步摆好**。
   * 以前是 index.html 先 insertBefore 到卡片里，再由下面的
   * setTimeout(() => TY.toggleNoteFull(viewport, true), 80) 搬进白板浮层 ——
   * 于是每轮轮询都有 ~100ms 待在卡片里（全屏时那个位置在浮层后面，根本看不见），
   * 便签墙左上角的整理条就成了「一直在闪」。实测每 2500ms 跳一次位。
   * 现在：全屏 → 直接落成浮层；非全屏 → 直接放回卡片顶部。全程同步，不经过中间态。 */
  if (opts.arrangeBar) {
    const bar = opts.arrangeBar;
    if (wasFull) {
      bar.classList.add('full-float');
      viewport.__barEl = bar;
      viewport.__barHome = holder;
      viewport.appendChild(bar);
    } else {
      holder.insertBefore(bar, holder.firstChild);
    }
  }

  // 渲染时 viewport 还没进 DOM（宽高为 0），所有尺寸依赖的计算都拿不到正确值。
  // 延迟一帧等元素进入文档后再 setup，避免「放大就往右下角跳」的首屏闪烁
  const _needsDefer = !viewport.clientWidth;
  if (_needsDefer) {
    /* ⚠️ 只有**首屏**才需要把画布藏起来。renderNotes 一直在「还没插进文档」的时候被调用
     * （卡片是渲染完才 append 到页面上的），所以 _needsDefer 每轮轮询都为真 ——
     * 原来无脑 visibility:hidden 的结果是「白板内容每 2.5s 白一帧」。
     * 位置是上一轮存好的（TY._ncViews），先把它同步打上去，就不用藏。 */
    const savedSt = TY._ncViews && TY._ncViews[keepKey];
    if (savedSt && savedSt.ready) {
      /* 位置 + 可见性都**同步**一次性打上：新画布元素刚建出来时 visibility 是 ''（等于可见），
       * 若留给下面的 rAF 再补一个 'visible'，逐帧记录里就会看到「'' → visible」的抖动
       * ——视觉上无变化，但它会让「到底还闪不闪」这件事没法用一条断言证明。 */
      canvas.style.transformOrigin = '0 0';
      canvas.style.transform = 'translate(' + Math.round(savedSt.tx) + 'px,' + Math.round(savedSt.ty) + 'px) scale(' + savedSt.z + ')';
      canvas.style.visibility = 'visible';
    } else {
      canvas.style.visibility = 'hidden';   // 首屏：还不知道该放哪儿，先藏
    }
    requestAnimationFrame(() => {
      TY.setupInfiniteCanvas(viewport, canvas, opts);
      canvas.style.visibility = 'visible';
      // 量一遍内容包围盒
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      canvas.querySelectorAll('.note-mini').forEach((el) => {
        x0 = Math.min(x0, el.offsetLeft); y0 = Math.min(y0, el.offsetTop);
        x1 = Math.max(x1, el.offsetLeft + el.offsetWidth); y1 = Math.max(y1, el.offsetTop + el.offsetHeight);
      });
      canvas.querySelectorAll('.note-anchor').forEach((el) => {
        x0 = Math.min(x0, el.offsetLeft - el.offsetWidth / 2); y0 = Math.min(y0, el.offsetTop - el.offsetHeight / 2);
        x1 = Math.max(x1, el.offsetLeft + el.offsetWidth / 2); y1 = Math.max(y1, el.offsetTop + el.offsetHeight / 2);
      });
      canvas.__bbox = (x0 === Infinity)
        ? { x: NC_ORIGIN + NC_BASE_W * 0.12, y: NC_ORIGIN + NC_BASE_H * 0.12, w: NC_BASE_W * 0.76, h: NC_BASE_H * 0.7 }
        : { x: x0 - 70, y: y0 - 70, w: (x1 - x0) + 140, h: (y1 - y0) + 140 };
      // 整理条的摆放已经在上面同步做完了（以前这里还有个 setTimeout 80ms 的搬运动作 ——
      // 那正是「全屏下整理条每轮轮询闪一次」的元凶，别再搬第二次）
    });
  } else {
    TY.setupInfiniteCanvas(viewport, canvas, opts);
    requestAnimationFrame(() => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      canvas.querySelectorAll('.note-mini').forEach((el) => {
        x0 = Math.min(x0, el.offsetLeft); y0 = Math.min(y0, el.offsetTop);
        x1 = Math.max(x1, el.offsetLeft + el.offsetWidth); y1 = Math.max(y1, el.offsetTop + el.offsetHeight);
      });
      canvas.querySelectorAll('.note-anchor').forEach((el) => {
        x0 = Math.min(x0, el.offsetLeft - el.offsetWidth / 2); y0 = Math.min(y0, el.offsetTop - el.offsetHeight / 2);
        x1 = Math.max(x1, el.offsetLeft + el.offsetWidth / 2); y1 = Math.max(y1, el.offsetTop + el.offsetHeight / 2);
      });
      canvas.__bbox = (x0 === Infinity)
        ? { x: NC_ORIGIN + NC_BASE_W * 0.12, y: NC_ORIGIN + NC_BASE_H * 0.12, w: NC_BASE_W * 0.76, h: NC_BASE_H * 0.7 }
        : { x: x0 - 70, y: y0 - 70, w: (x1 - x0) + 140, h: (y1 - y0) + 140 };
    });
  }

  if (opts.bind) {
    holder.querySelectorAll('.note-like').forEach((x) => x.addEventListener('click', () => opts.bind('like', x.dataset.id)));
    holder.querySelectorAll('.note-del').forEach((x) => x.addEventListener('click', () => opts.bind('del', x.dataset.id)));
  }
  return { viewport, canvas };
}

/* 单个互动里一个题单元的总参与数 */
function joinCount(b) {
  const cfg = b.config || {};
  if (b.type === 'notes') {
    const c = {}; (cfg.legend || []).forEach((l) => { c[l.color] = true; });
    return { n: 0, base: 0 };
  }
  return 0;
}

/* 生成课程封面渐变（不传 cover 时按索引） */
const COVERS = ['linear-gradient(135deg,#0F766E,#5EEAD4)', 'linear-gradient(135deg,#0F766E,#2DD4BF)', 'linear-gradient(135deg,#B45309,#F59E0B)', 'linear-gradient(135deg,#9D174D,#F472B6)'];
