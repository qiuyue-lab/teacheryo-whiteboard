/* ============================================================
 * TeacherYO · 云数据访问层（CloudBase JS SDK v3 + PostgreSQL）
 * ============================================================
 * 环境为 CloudBase PG 模式：业务数据用 app.rdb()（PostgREST 风格），
 * 三张表 courses / boards / submissions（见 cloudbase/migrations）。
 *
 * 依赖：vendor/cloudbase.full.js(全局 cloudbase) + config.js
 * 登录：auth.signInAnonymously()（教师端/学生端均匿名，RLS 控制读写）
 * 实时：MVP 用轮询刷新（每 ~2.5s），后续可换 realtime。
 * ============================================================ */
(function () {
  const CFG = window.TY_CONFIG || {};
  const TABLES = (CFG.tables && CFG.tables.courses)
    ? CFG.tables
    : { courses: 'courses', boards: 'boards', submissions: 'submissions' };

  /* ============================================================
   * 工具函数：本地 / 云端两种模式共用
   * ============================================================ */
  function baseUrl() {
    if (CFG.baseUrl) return CFG.baseUrl;
    if (location.protocol === 'file:') {
      // 直接双击打开（file://）时 location.origin 是 "null"，改用当前文件所在目录
      return location.href.split('#')[0].split('?')[0].replace(/\/[^/]*$/, '');
    }
    return location.origin;
  }
  function studentEntryUrl() { return baseUrl() + '/student.html'; }
  function studentUrl(boardId) { return baseUrl() + '/student.html?b=' + boardId; }
  function studentCodeUrl(code) { return baseUrl() + '/student.html?c=' + String(code || '').trim(); }
  function teacherUrl(courseId, boardId) {
    let u = baseUrl() + '/index.html';
    const p = [];
    if (courseId) p.push('c=' + courseId);
    if (boardId) p.push('b=' + boardId);
    if (p.length) u += '#' + p.join('&');
    return u;
  }
  const now = () => Date.now();
  const shortId = (id) => String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  const cfg = () => CFG;
  const COMMON = { cfg, now, baseUrl, studentUrl, studentEntryUrl, studentCodeUrl, teacherUrl, shortId };

  /* ============================================================
   * 环境探测
   *   envId 留空  → 零配置本地模式：数据存浏览器，双击即可使用
   *   envId 有值  → 云端模式：CloudBase PostgreSQL，多人协作
   * ============================================================ */
  const envId = String(CFG.envId || '').trim();
  const isPlaceholder = !envId
    || /^(your|xxx|none|null|填写|待填|<)/i.test(envId)
    || envId === 'YOUR_ENV_ID';

  if (isPlaceholder) {
    let local = window.TY_LOCAL;
    if (!local) {
      console.error('[TY-db] 找不到 js/store.local.js，本地模式无法启用，请确认该文件已引入。');
      local = new Proxy({}, {
        get() {
          return async () => { throw new Error('本地数据层缺失：js/store.local.js 未加载'); };
        }
      });
    }
    window.TY = Object.assign(window.TY || {}, COMMON, { isLocal: true, db: local });
    console.info('[TeacherYO] 当前为「本地模式」：数据只保存在这台设备的浏览器里。'
      + '需要学生扫码协作时，请在 config.js 填入 CloudBase 配置（见 README）。');
    return;
  }

  /* ============================================================
   * 云端模式（CloudBase PostgreSQL）
   * ============================================================ */
  const APP = { ready: null, app: null, auth: null };

  function fail(msg) { console.error('[TY-db]', msg); throw new Error(msg); }
  function ensure() { if (!APP.ready) APP.ready = init(); return APP.ready; }

  async function init() {
    if (!CFG.envId) fail('config.js envId 为空');
    // vendor 单文件暴露兼容：esbuild IIFE 可能把全局挂在 cloudbase.default
    const SDK = (typeof cloudbase !== 'undefined' && cloudbase && cloudbase.default && typeof cloudbase.default.init === 'function' && typeof cloudbase.init !== 'function')
      ? cloudbase.default
      : (typeof cloudbase !== 'undefined' ? cloudbase : null);
    if (!SDK) fail('vendor/cloudbase.full.js 未加载');
    APP.app = SDK.init({ env: CFG.envId, region: CFG.region || 'ap-shanghai', accessKey: CFG.accessKey });
    APP.auth = APP.app.auth;
    try {
      const { data } = await APP.auth.getSession();
      if (!data || !data.session) {
        const { error } = await APP.auth.signInAnonymously();
        if (error) throw error;
      }
    } catch (e) {
      console.warn('[TY-db] anonymous login:', e && e.message);
    }
    APP.db = APP.app.rdb();
    return true;
  }
  const db = () => { if (!APP.db) fail('db not ready'); return APP.db; };
  const T = () => TABLES;

  /* ---------- auth ---------- */
  async function currentUid() {
    await ensure();
    const { data } = await APP.auth.getSession();
    return (data && data.session && data.session.user && data.session.user.id) || '';
  }

  /* ---------- courses ---------- */
  async function listCourses() {
    await ensure();
    const { data, error } = await db().from(T().courses).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  async function getCourse(id) {
    await ensure();
    const { data, error } = await db().from(T().courses).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }
  async function createCourse({ name, emoji, cover }) {
    await ensure();
    const { data, error } = await db().from(T().courses)
      .insert({ name, emoji: emoji || '', cover: cover || '' })
      .select('id').single();
    if (error) throw error;
    return data.id;
  }
  async function updateCourse(id, patch) {
    await ensure();
    const { error } = await db().from(T().courses).update(patch).eq('id', id);
    if (error) throw error;
  }
  async function deleteCourse(id) {
    await ensure();
    const { error } = await db().from(T().courses).delete().eq('id', id); // cascade 自动删 boards/submissions
    if (error) throw error;
  }

  /* ---------- boards ---------- */
  async function listBoards(courseId) {
    await ensure();
    const { data, error } = await db().from(T().boards)
      .select('*').eq('course_id', courseId).order('step', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  async function getBoard(id) {
    await ensure();
    const { data, error } = await db().from(T().boards).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }
  /* 通过 6 位课堂码反查互动；查不到返回 null */
  async function getBoardByCode(code) {
    await ensure();
    const key = String(code || '').trim();
    if (!/^\d{6}$/.test(key)) return null;
    const { data, error } = await db().from(T().boards).select('*').eq('code', key).limit(1);
    if (error) throw error;
    return (data && data[0]) || null;
  }
  /* 生成不重复的 6 位数字课堂码 */
  async function nextCode() {
    await ensure();
    for (let i = 0; i < 12; i++) {
      const code = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      const { data } = await db().from(T().boards).select('id', { count: 'exact', head: true }).eq('code', code);
      if (!data || !data.length) return code;
    }
    return String(Date.now()).slice(-6); // 兜底
  }
  async function createBoard({ courseId, type, title, config }) {
    await ensure();
    /* step 取「当前最大 step + 1」，**不是**「条数 + 1」。
     * 用条数算会撞车：课程里原有 [1,2,3]，删掉中间那个后剩 [1,3]，此时新建算出来是 3，
     * 就和已有的 3 并列了 —— 并列之后基于 swap 的排序怎么点都换不动（线上踩过）。 */
    const { data: rows } = await db().from(T().boards).select('step').eq('course_id', courseId);
    const step = (rows || []).reduce((m, r) => Math.max(m, r.step || 0), 0) + 1;
    const code = await nextCode();
    const { data, error } = await db().from(T().boards)
      .insert({ course_id: courseId, type, title: title || '', status: 'active', config: config || {}, step, code })
      .select('id, code').single();
    if (error) throw error;
    return { id: data.id, step, code: data.code };
  }
  async function updateBoard(id, patch) {
    await ensure();
    const { error } = await db().from(T().boards).update(patch).eq('id', id);
    if (error) throw error;
  }
  async function archiveBoard(id) { await updateBoard(id, { status: 'archived' }); }
  async function reopenBoard(id) { await updateBoard(id, { status: 'active' }); }
  async function moveBoard(id, courseId, dir) {
    await ensure();
    const boards = await listBoards(courseId);
    const i = boards.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= boards.length) return false;
    // 交换 step
    const { error: e1 } = await db().from(T().boards).update({ step: boards[j].step }).eq('id', boards[i].id);
    const { error: e2 } = await db().from(T().boards).update({ step: boards[i].step }).eq('id', boards[j].id);
    if (e1 || e2) throw e1 || e2;
    return true;
  }
  /* 拖动排序：按给定顺序重写 step（1..n）。
   * step 上没有唯一约束，所以可以并行写；ids 里漏掉的本课程互动会接到末尾。 */
  async function reorderBoards(courseId, orderedIds) {
    await ensure();
    const boards = await listBoards(courseId);
    const mine = new Set(boards.map((b) => b.id));
    const ids = (orderedIds || []).filter((id) => mine.has(id));
    const seen = new Set(ids);
    boards.forEach((b) => { if (!seen.has(b.id)) ids.push(b.id); });
    const res = await Promise.all(ids.map((id, i) =>
      db().from(T().boards).update({ step: i + 1 }).eq('id', id)
    ));
    const bad = (res || []).find((r) => r && r.error);
    if (bad) throw bad.error;
    return true;
  }
  async function deleteBoard(id) {
    await ensure();
    const { error } = await db().from(T().boards).delete().eq('id', id);
    if (error) throw error;
  }

  /* ---------- submissions ---------- */
  async function listSubmissions(boardId) {
    await ensure();
    const { data, error } = await db().from(T().submissions)
      .select('*').eq('board_id', boardId).order('created_at', { ascending: false }).limit(5000);
    if (error) throw error;
    return data || [];
  }
  /* data: 载荷对象（按 type 约定） */
  async function submit({ boardId, type, partIdx, author, data }) {
    await ensure();
    const uid = await currentUid();
    const { data: d, error } = await db().from(T().submissions)
      .insert({ board_id: boardId, type, part_idx: partIdx || 0, author: author || '匿名同学', data, uid, liked_by: [] })
      .select('id').single();
    if (error) throw error;
    return d.id;
  }
  async function toggleLike(sub) {
    await ensure();
    const uid = await currentUid();
    const likedBy = sub.liked_by || [];
    const liked = likedBy.indexOf(uid) >= 0;
    const next = liked ? likedBy.filter((x) => x !== uid) : likedBy.concat([uid]);
    const { error } = await db().from(T().submissions)
      .update({ liked_by: next, likes: Math.max(0, (sub.likes || 0) + (liked ? -1 : 1)) })
      .eq('id', sub.id);
    if (error) throw error;
    return !liked;
  }
  async function removeSubmission(id) {
    await ensure();
    const { error } = await db().from(T().submissions).delete().eq('id', id);
    if (error) throw error;
  }
  async function updateSubmission(id, patch) {
    await ensure();
    const { error } = await db().from(T().submissions).update(patch).eq('id', id);
    if (error) throw error;
  }

  window.TY = Object.assign(window.TY || {}, COMMON, {
    isLocal: false,
    db: {
      currentUid,
      listCourses, getCourse, createCourse, updateCourse, deleteCourse,
      listBoards, getBoard, getBoardByCode, createBoard, updateBoard, archiveBoard, reopenBoard, moveBoard, reorderBoards, deleteBoard,
      listSubmissions, submit, toggleLike, removeSubmission, updateSubmission
    }
  });
})();
