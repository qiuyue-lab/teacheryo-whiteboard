/* ============================================================
 * TeacherYO · 云端数据层（TeacherYO Worker API + D1）
 * ============================================================
 * 什么时候启用：config.js 里的 api 填了数据 API Worker 地址时，
 * 由 js/db.js 自动挂载（替代旧的 CloudBase SDK 实现）。
 *
 * 两条设计约束（与 store.local.js 一致）：
 *   1. 字段名 snake_case（course_id / created_at / liked_by / part_idx），
 *      Worker 直接返回列名，index.html / common.js 不感知模式差异。
 *   2. uid 存浏览器 localStorage（ty.api.uid），每次请求经 x-ty-uid 头带上，
 *      toggleLike 的「同 uid 点赞/取消」语义靠它维持（免注册课堂场景）。
 * ============================================================ */
(function () {
  var CFG = window.TY_CONFIG || {};
  var API = String(CFG.api || '').trim().replace(/\/+$/, '');
  var UID_KEY = 'ty.api.uid';
  var uidCache = '';

  function uuid() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    } catch (e) { /* 走降级 */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  async function currentUid() {
    if (uidCache) return uidCache;
    try { uidCache = window.localStorage.getItem(UID_KEY) || ''; } catch (e) { uidCache = ''; }
    if (!uidCache) {
      uidCache = 'web-' + uuid().slice(0, 8);
      try { window.localStorage.setItem(UID_KEY, uidCache); } catch (e) { /* 忽略 */ }
    }
    return uidCache;
  }

  async function req(method, path, body) {
    var r;
    try {
      r = await fetch(API + path, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'X-Ty-Uid': await currentUid()
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e) {
      throw new Error('连接数据服务失败（网络或 API 地址问题）');
    }
    var data = null;
    try { data = await r.json(); } catch (e) { /* 204 等 */ }
    if (!r.ok) {
      throw new Error((data && data.error) || ('请求失败（' + r.status + '）'));
    }
    return data;
  }

  /* ---------- courses ---------- */
  async function listCourses() { return req('GET', '/courses'); }
  async function getCourse(id) {
    try { return await req('GET', '/courses/' + encodeURIComponent(id)); }
    catch (e) { if (String(e.message).indexOf('课程不存在') >= 0) throw e; throw e; }
  }
  async function createCourse(o) {
    var d = await req('POST', '/courses', { name: o.name, emoji: o.emoji || '', cover: o.cover || '' });
    return d.id;
  }
  async function updateCourse(id, patch) { await req('PUT', '/courses/' + encodeURIComponent(id), patch); }
  async function deleteCourse(id) { await req('DELETE', '/courses/' + encodeURIComponent(id)); }

  /* ---------- boards ---------- */
  async function listBoards(courseId) { return req('GET', '/boards?course_id=' + encodeURIComponent(courseId)); }
  async function getBoard(id) { return req('GET', '/boards/' + encodeURIComponent(id)); }
  async function getBoardByCode(code) {
    var d = await req('GET', '/boards/by-code/' + encodeURIComponent(String(code || '').trim()));
    return (d && d.board) || null;
  }
  async function createBoard(o) {
    return req('POST', '/boards', { courseId: o.courseId, type: o.type, title: o.title || '', config: o.config || {} });
  }
  async function updateBoard(id, patch) { await req('PUT', '/boards/' + encodeURIComponent(id), patch); }
  async function archiveBoard(id) { await req('POST', '/boards/' + encodeURIComponent(id) + '/archive', {}); }
  async function reopenBoard(id) { await req('POST', '/boards/' + encodeURIComponent(id) + '/reopen', {}); }
  async function moveBoard(id, courseId, dir) {
    var d = await req('POST', '/boards/' + encodeURIComponent(id) + '/move', { courseId: courseId, dir: dir });
    return !!(d && d.moved);
  }
  async function reorderBoards(courseId, orderedIds) {
    await req('POST', '/courses/' + encodeURIComponent(courseId) + '/reorder', { orderedIds: orderedIds || [] });
    return true;
  }
  async function deleteBoard(id) { await req('DELETE', '/boards/' + encodeURIComponent(id)); }

  /* ---------- submissions ---------- */
  async function listSubmissions(boardId) {
    return req('GET', '/submissions?board_id=' + encodeURIComponent(boardId));
  }
  async function submit(o) {
    var d = await req('POST', '/submissions', {
      boardId: o.boardId, type: o.type, partIdx: o.partIdx || 0,
      author: o.author || '匿名同学', data: o.data || {}
    });
    return d.id;
  }
  async function toggleLike(sub) {
    var d = await req('POST', '/submissions/' + encodeURIComponent(sub.id) + '/like', {});
    return !!(d && d.liked);
  }
  async function removeSubmission(id) { await req('DELETE', '/submissions/' + encodeURIComponent(id)); }
  async function updateSubmission(id, patch) { await req('PUT', '/submissions/' + encodeURIComponent(id), patch); }

  window.TY_API = {
    isLocal: false,
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
    updateSubmission: updateSubmission
  };
})();
