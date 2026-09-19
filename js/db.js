/* ============================================================
 * TeacherYO · 云数据访问层入口
 * ============================================================
 * 两种模式（同签名，见 js/store.api.js / js/store.local.js）：
 *   - config.js 的 api 留空 → 本地模式（localStorage，js/store.local.js）
 *   - api 填了数据 API Worker 地址 → 云端模式（D1，js/store.api.js）
 *
 * 依赖：config.js / config.local.js + js/store.local.js + js/store.api.js
 * 实时：MVP 用轮询刷新（每 ~2.5s）。
 * ============================================================ */
(function () {
  const CFG = window.TY_CONFIG || {};

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
   *   api 留空  → 零配置本地模式：数据存浏览器，双击即可使用
   *   api 有值  → 云端模式：TeacherYO Worker API（D1），多人协作
   * ============================================================ */
  const apiBase = String(CFG.api || '').trim();
  const isPlaceholder = !apiBase
    || /^(your|xxx|none|null|填写|待填|<)/i.test(apiBase)
    || apiBase === 'YOUR_API_URL';

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
      + '需要学生扫码协作时，请在 config.js 填入 api 数据服务地址（见 README）。');
    return;
  }

  /* ============================================================
   * 云端模式（TeacherYO Worker API + D1）
   * ============================================================ */
  const api = window.TY_API;
  if (!api) {
    const msg = '找不到 js/store.api.js，云端模式无法启用，请确认该文件已引入。';
    console.error('[TY-db]', msg);
    throw new Error(msg);
  }

  window.TY = Object.assign(window.TY || {}, COMMON, {
    isLocal: false,
    db: api
  });
})();
