/* ============================================================
 * TeacherYO · 本地数据层（零配置模式）
 * ============================================================
 * 什么时候启用：config.js 里的 envId 留空时，由 js/db.js 自动挂载。
 * 数据存哪：浏览器 localStorage（换浏览器/清缓存会丢，重要数据请导出）。
 *
 * 两条设计约束：
 *   1. 字段名与云端 PG 表严格一致（snake_case：course_id / created_at /
 *      liked_by / part_idx ...），这样 index.html、common.js 完全不需要
 *      区分「本地」和「云端」两种模式。
 *   2. 每次都重新读 localStorage，不缓存 —— 同一个浏览器里开两个标签页
 *      （一个当大屏、一个当学生）时，学生提交的数据刷新时就能被大屏读到，
 *      从而在零配置的前提下完整演示课堂互动流程。
 * ============================================================ */
(function () {
  var KEY = 'ty.local.v1';
  var UID_KEY = 'ty.local.uid';
  var useLS = null;      // null = 还没探测过；localStorage 不可用时退化为内存
  var fallback = null;
  var uidCache = '';

  /* ---------- 存储读写 ---------- */
  function lsOk() {
    if (useLS !== null) return useLS;
    try {
      window.localStorage.setItem('__ty_probe__', '1');
      window.localStorage.removeItem('__ty_probe__');
      useLS = true;
    } catch (e) {
      useLS = false;
    }
    return useLS;
  }

  function blank() { return { v: 1, courses: [], boards: [], submissions: [] }; }

  function all() {
    if (!lsOk()) {
      if (!fallback) fallback = blank();
      return fallback;
    }
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { raw = null; }
    var s = null;
    if (raw) { try { s = JSON.parse(raw); } catch (e) { s = null; } }
    if (!s || typeof s !== 'object') s = blank();
    if (!Array.isArray(s.courses)) s.courses = [];
    if (!Array.isArray(s.boards)) s.boards = [];
    if (!Array.isArray(s.submissions)) s.submissions = [];
    return s;
  }

  function save(s) {
    if (!lsOk()) { fallback = s; return; }
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { fallback = s; }
  }

  /* ---------- 小工具 ---------- */
  function uuid() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    } catch (e) { /* 继续走降级 */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function indexOfId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  }
  function unsorted(list) { return clone(list); }

  async function currentUid() {
    if (uidCache) return uidCache;
    if (lsOk()) {
      try { uidCache = window.localStorage.getItem(UID_KEY) || ''; } catch (e) { uidCache = ''; }
      if (!uidCache) {
        uidCache = 'local-' + uuid().slice(0, 8);
        try { window.localStorage.setItem(UID_KEY, uidCache); } catch (e) { /* 忽略 */ }
      }
    } else {
      uidCache = 'local-' + uuid().slice(0, 8);
    }
    return uidCache;
  }

  /* ---------- courses ---------- */
  async function listCourses() {
    return unsorted(all().courses).sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); });
  }
  async function getCourse(id) {
    var c = all().courses[indexOfId(all().courses, id)];
    if (!c) throw new Error('课程不存在（可能已被删除）');
    return clone(c);
  }
  async function createCourse(o) {
    var s = all();
    var row = {
      id: uuid(),
      name: o.name,
      emoji: o.emoji || '',
      cover: o.cover || '',
      created_at: Date.now(),
      created_by: await currentUid()
    };
    s.courses.push(row);
    save(s);
    return row.id;
  }
  async function updateCourse(id, patch) {
    var s = all();
    var i = indexOfId(s.courses, id);
    if (i < 0) throw new Error('课程不存在');
    Object.assign(s.courses[i], patch);
    save(s);
  }
  async function deleteCourse(id) {
    var s = all();
    s.courses = s.courses.filter(function (c) { return c.id !== id; });
    var orphan = s.boards.filter(function (b) { return b.course_id === id; }).map(function (b) { return b.id; });
    s.boards = s.boards.filter(function (b) { return b.course_id !== id; });
    s.submissions = s.submissions.filter(function (r) { return orphan.indexOf(r.board_id) < 0; });
    save(s);
  }

  /* ---------- boards ---------- */
  async function listBoards(courseId) {
    return unsorted(all().boards)
      .filter(function (b) { return b.course_id === courseId; })
      .sort(function (a, b) { return (a.step || 0) - (b.step || 0); });
  }
  async function getBoard(id) {
    var b = all().boards[indexOfId(all().boards, id)];
    if (!b) throw new Error('互动不存在（可能已被删除）');
    return clone(b);
  }
  async function getBoardByCode(code) {
    var key = String(code || '').trim();
    if (!/^\d{6}$/.test(key)) return null;
    var hit = all().boards.filter(function (b) { return b.code === key; })[0];
    return hit ? clone(hit) : null;
  }
  async function nextCode() {
    var s = all();
    for (var i = 0; i < 12; i++) {
      var c = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      var dup = s.boards.some(function (b) { return b.code === c; });
      if (!dup) return c;
    }
    return String(Date.now()).slice(-6);
  }
  async function createBoard(o) {
    var s = all();
    var n = s.boards.filter(function (b) { return b.course_id === o.courseId; }).length;
    var row = {
      id: uuid(),
      course_id: o.courseId,
      step: n + 1,
      type: o.type,
      title: o.title || '',
      status: 'active',
      config: o.config || {},
      created_at: Date.now(),
      code: await nextCode()
    };
    s.boards.push(row);
    save(s);
    return { id: row.id, step: row.step, code: row.code };
  }
  async function updateBoard(id, patch) {
    var s = all();
    var i = indexOfId(s.boards, id);
    if (i < 0) throw new Error('互动不存在');
    Object.assign(s.boards[i], patch);
    save(s);
  }
  async function archiveBoard(id) { return updateBoard(id, { status: 'archived' }); }
  async function reopenBoard(id) { return updateBoard(id, { status: 'active' }); }
  async function moveBoard(id, courseId, dir) {
    var s = all();
    var list = s.boards
      .filter(function (b) { return b.course_id === courseId; })
      .sort(function (a, b) { return (a.step || 0) - (b.step || 0); });
    var i = indexOfId(list, id);
    var j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return false;
    var tmp = list[i].step;
    list[i].step = list[j].step;
    list[j].step = tmp;
    save(s);
    return true;
  }
  /* 拖动排序：按给定顺序重写 step（1..n）。
   * ids 里没覆盖到的本课程互动会接到末尾，绝不会因为漏传而丢数据。 */
  async function reorderBoards(courseId, orderedIds) {
    var s = all();
    var list = s.boards
      .filter(function (b) { return b.course_id === courseId; })
      .sort(function (a, b) { return (a.step || 0) - (b.step || 0); });
    var mine = {};
    list.forEach(function (b) { mine[b.id] = true; });
    var ids = (orderedIds || []).filter(function (id) { return mine[id]; });
    var seen = {};
    ids.forEach(function (id) { seen[id] = true; });
    list.forEach(function (b) { if (!seen[b.id]) ids.push(b.id); });
    ids.forEach(function (id, i) {
      var b = s.boards[indexOfId(s.boards, id)];
      if (b && b.course_id === courseId) b.step = i + 1;
    });
    save(s);
    return true;
  }
  async function deleteBoard(id) {
    var s = all();
    s.boards = s.boards.filter(function (b) { return b.id !== id; });
    s.submissions = s.submissions.filter(function (r) { return r.board_id !== id; });
    save(s);
  }

  /* ---------- submissions ---------- */
  async function listSubmissions(boardId) {
    return unsorted(all().submissions)
      .filter(function (r) { return r.board_id === boardId; })
      .sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); })
      .slice(0, 5000);
  }
  async function submit(o) {
    var s = all();
    var row = {
      id: uuid(),
      board_id: o.boardId,
      type: o.type,
      part_idx: o.partIdx || 0,
      author: o.author || '匿名同学',
      data: o.data || {},
      likes: 0,
      liked_by: [],
      uid: await currentUid(),
      created_at: Date.now()
    };
    s.submissions.push(row);
    save(s);
    return row.id;
  }
  async function toggleLike(sub) {
    var s = all();
    var i = indexOfId(s.submissions, sub.id);
    if (i < 0) return false;
    var me = await currentUid();
    var row = s.submissions[i];
    var likedBy = row.liked_by || [];
    var liked = likedBy.indexOf(me) >= 0;
    row.liked_by = liked
      ? likedBy.filter(function (x) { return x !== me; })
      : likedBy.concat([me]);
    row.likes = Math.max(0, (row.likes || 0) + (liked ? -1 : 1));
    save(s);
    return !liked;
  }
  async function removeSubmission(id) {
    var s = all();
    s.submissions = s.submissions.filter(function (r) { return r.id !== id; });
    save(s);
  }
  async function updateSubmission(id, patch) {
    var s = all();
    var i = indexOfId(s.submissions, id);
    if (i < 0) return;
    Object.assign(s.submissions[i], patch);
    save(s);
  }

  /* ---------- 数据备份（本地模式专用） ---------- */
  function dump() { return clone(all()); }
  function exportJSON() { return JSON.stringify(all(), null, 2); }
  function importJSON(text) {
    var s = JSON.parse(text);
    if (!s || !Array.isArray(s.courses)) throw new Error('格式不对：缺少 courses 数组');
    save({
      v: 1,
      courses: s.courses || [],
      boards: s.boards || [],
      submissions: s.submissions || []
    });
  }
  function reset() { save(blank()); }

  window.TY_LOCAL = {
    isLocal: true,
    currentUid: currentUid,
    listCourses: listCourses,
    getCourse: getCourse,
    createCourse: createCourse,
    updateCourse: updateCourse,
    deleteCourse: deleteCourse,
    listBoards: listBoards,
    getBoard: getBoard,
    getBoardByCode: getBoardByCode,
    createBoard: createBoard,
    updateBoard: updateBoard,
    archiveBoard: archiveBoard,
    reopenBoard: reopenBoard,
    moveBoard: moveBoard,
    reorderBoards: reorderBoards,
    deleteBoard: deleteBoard,
    listSubmissions: listSubmissions,
    submit: submit,
    toggleLike: toggleLike,
    removeSubmission: removeSubmission,
    updateSubmission: updateSubmission,
    dump: dump,
    exportJSON: exportJSON,
    importJSON: importJSON,
    reset: reset
  };
})();
