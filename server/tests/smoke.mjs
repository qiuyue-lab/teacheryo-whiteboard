/* TeacherYO API 功能测试（21 接口正反向 + CORS）——零依赖，node tests/smoke.mjs */
const BASE = process.env.TY_API || 'http://localhost:8787';
let PASS = 0, FAIL = 0;
const fails = [];

function ok(name, cond, extra) {
  if (cond) { PASS++; console.log(`  ✓ ${name}`); }
  else { FAIL++; fails.push(name); console.log(`  ✗ ${name}${extra ? ' → ' + extra : ''}`); }
}

async function api(method, path, body, opts = {}) {
  const h = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const r = await fetch(BASE + path, {
    method, headers: h,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let data = null;
  try { data = await r.json(); } catch { /* 204 等 */ }
  return { status: r.status, data, headers: r.headers };
}

/* 并发跑全量用例 */
async function main() {
  console.log(`\n=== TeacherYO API 冒烟测试 → ${BASE} ===\n`);

  /* CORS */
  console.log('— CORS —');
  const bad = await api('GET', '/courses', undefined, { headers: { Origin: 'https://evil.example.com' } });
  ok('白名单外 Origin → 403 且无 ACAO', bad.status === 403 && !bad.headers.get('access-control-allow-origin'));
  const pre = await fetch(BASE + '/courses', { method: 'OPTIONS', headers: { Origin: 'http://localhost:8000', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-ty-uid' } });
  ok('预检 → 204 + ACAO 回显', pre.status === 204 && pre.headers.get('access-control-allow-origin') === 'http://localhost:8000', `status=${pre.status}`);

  /* courses */
  console.log('— courses —');
  const noName = await api('POST', '/courses', { name: '  ' });
  ok('建课程缺 name → 400', noName.status === 400);
  const c1 = await api('POST', '/courses', { name: '冒烟课程A', emoji: '📚' }, { headers: { 'X-Ty-Uid': 't-teacher' } });
  ok('建课程 → id', c1.status === 200 && /^[0-9a-f-]{36}$/.test(c1.data.id), JSON.stringify(c1.data));
  await new Promise(r => setTimeout(r, 5));
  const c2 = await api('POST', '/courses', { name: '冒烟课程B' });
  ok('再建一门 → id', c2.status === 200 && !!c2.data.id);
  const list = await api('GET', '/courses');
  ok('listCourses 按 created_at 倒序', list.status === 200 && list.data[0].name === '冒烟课程B', JSON.stringify(list.data.map(x => x.name)));
  ok('字段 snake_case（created_at / created_by）', list.data[0].created_at > 0 && 'created_by' in list.data[0]);
  const got = await api('GET', `/courses/${c1.data.id}`);
  ok('getCourse 命中', got.status === 200 && got.data.name === '冒烟课程A' && got.data.emoji === '📚');
  const miss = await api('GET', `/courses/not-exist`);
  ok('getCourse 未命中 → 404', miss.status === 404);
  const upd = await api('PUT', `/courses/${c1.data.id}`, { emoji: '🎓' });
  const got2 = await api('GET', `/courses/${c1.data.id}`);
  ok('updateCourse 生效', upd.status === 200 && got2.data.emoji === '🎓');

  /* boards */
  console.log('— boards —');
  const b1 = await api('POST', '/boards', { courseId: c1.data.id, type: 'notes', title: '便签墙' });
  ok('建互动 → {id, step, code}', b1.status === 200 && b1.data.step === 1 && /^\d{6}$/.test(b1.data.code), JSON.stringify(b1.data));
  const b2 = await api('POST', '/boards', { courseId: c1.data.id, type: 'choice', config: { options: ['A', 'B'] } });
  ok('第二个互动 step=2（max+1 口径）', b2.data.step === 2);
  const b3 = await api('POST', '/boards', { courseId: c1.data.id, type: 'rollcall' });
  ok('第三个互动 step=3', b3.data.step === 3);
  ok('课堂码不重复', b1.data.code !== b2.data.code && b2.data.code !== b3.data.code);
  const bList = await api('GET', `/boards?course_id=${c1.data.id}`);
  ok('listBoards 按 step 升序', bList.data.map(x => x.step).join(',') === '1,2,3');
  const b2row = bList.data.find(x => x.id === b2.data.id);
  ok('config 是对象（JSON mode）', b2row && typeof b2row.config === 'object' && Array.isArray(b2row.config.options), JSON.stringify(b2row && b2row.config));
  const byCode = await api('GET', `/boards/by-code/${b1.data.code}`);
  ok('课堂码反查命中', byCode.data.board && byCode.data.board.id === b1.data.id);
  const byCodeMiss = await api('GET', `/boards/by-code/999999`);
  ok('课堂码未命中 → board:null（不报错）', byCodeMiss.status === 200 && byCodeMiss.data.board === null);
  const byCodeBad = await api('GET', `/boards/by-code/abc`);
  ok('课堂码格式非法 → board:null', byCodeBad.data.board === null);
  const bMiss = await api('GET', `/boards/not-exist`);
  ok('getBoard 未命中 → 404', bMiss.status === 404);
  const bUpd = await api('PUT', `/boards/${b2.data.id}`, { title: '选择题·改', config: { options: ['A', 'B', 'C'], multi: false } });
  const bUpdGot = await api('GET', `/boards/${b2.data.id}`);
  ok('updateBoard 生效（title+config）', bUpd.status === 200 && bUpdGot.data.title === '选择题·改' && bUpdGot.data.config.multi === false);

  const arc = await api('POST', `/boards/${b3.data.id}/archive`);
  const arcGot = await api('GET', `/boards/${b3.data.id}`);
  ok('archive → status:archived', arc.status === 200 && arcGot.data.status === 'archived');
  const reo = await api('POST', `/boards/${b3.data.id}/reopen`);
  const reoGot = await api('GET', `/boards/${b3.data.id}`);
  ok('reopen → status:active', reo.status === 200 && reoGot.data.status === 'active');

  /* move / reorder */
  console.log('— move / reorder —');
  const mv = await api('POST', `/boards/${b2.data.id}/move`, { courseId: c1.data.id, dir: -1 });
  const mvList = await api('GET', `/boards?course_id=${c1.data.id}`);
  ok('move 上移一步（b2↔b1 交换 step）', mv.data.moved === true && mvList.data[0].id === b2.data.id, JSON.stringify(mvList.data.map(x => [x.step, x.title])));
  const reorder = await api('POST', `/courses/${c1.data.id}/reorder`, { orderedIds: [b3.data.id, b2.data.id, b1.data.id] });
  const rList = await api('GET', `/boards?course_id=${c1.data.id}`);
  ok('reorder 全量重写 1..n', reorder.status === 200 && rList.data.map(x => x.id).join(',') === [b3.data.id, b2.data.id, b1.data.id].join(',') && rList.data[0].step === 1);
  const reorderPar = await api('POST', `/courses/${c1.data.id}/reorder`, { orderedIds: ['fake-id', b2.data.id] });
  const rParList = await api('GET', `/boards?course_id=${c1.data.id}`);
  /* 兜底语义：fake 过滤掉 → [b2]，漏掉的 b3、b1 按现有 step 序接到末尾 → [b2, b3, b1] */
  ok('reorder 兜底：陌生 id 过滤 + 漏掉接末尾', reorderPar.status === 200 && rParList.data[0].id === b2.data.id && rParList.data[2].id === b1.data.id, JSON.stringify(rParList.data.map(x => x.id)));

  /* submissions */
  console.log('— submissions —');
  const s1 = await api('POST', '/submissions', { boardId: b1.data.id, type: 'note', author: '小明', data: { px: 100, py: 50, text: '好想法' } }, { headers: { 'X-Ty-Uid': 'stu-1' } });
  ok('submit → id', s1.status === 200 && /^[0-9a-f-]{36}$/.test(s1.data.id));
  await new Promise(r => setTimeout(r, 5));
  const s2 = await api('POST', '/submissions', { boardId: b1.data.id, type: 'note', author: '小红', data: { px: 200, py: 80, text: '另一个想法' } }, { headers: { 'X-Ty-Uid': 'stu-2' } });
  const sList = await api('GET', `/submissions?board_id=${b1.data.id}`);
  ok('listSubmissions 按 created_at 倒序', sList.data[0].author === '小红', JSON.stringify(sList.data.map(x => x.author)));
  ok('liked_by 初始 [] + uid 记录', Array.isArray(sList.data[0].liked_by) && sList.data[0].liked_by.length === 0 && sList.data[0].uid === 'stu-2');
  const sMiss = await api('GET', '/submissions');
  ok('缺 board_id → 400', sMiss.status === 400);

  /* like 原子性（单人语义） */
  console.log('— like —');
  const l1 = await api('POST', `/submissions/${s2.data.id}/like`, {}, { headers: { 'X-Ty-Uid': 'stu-1' } });
  ok('首次点赞 → liked:true', l1.data.liked === true);
  const l2 = await api('POST', `/submissions/${s2.data.id}/like`, {}, { headers: { 'X-Ty-Uid': 'stu-1' } });
  ok('同 uid 再点 → 取消 liked:false', l2.data.liked === false);
  const lGot = await api('GET', `/submissions?board_id=${b1.data.id}`);
  ok('取消后 likes=0 且数组干净', lGot.data[0].likes === 0 && lGot.data[0].liked_by.length === 0, JSON.stringify(lGot.data[0].likes));
  const l3 = await api('POST', `/submissions/${s2.data.id}/like`, {}, { headers: { 'X-Ty-Uid': 'stu-1' } });
  const l4 = await api('POST', `/submissions/${s2.data.id}/like`, {}, { headers: { 'X-Ty-Uid': 'stu-2' } });
  const lGot2 = await api('GET', `/submissions?board_id=${b1.data.id}`);
  ok('两人各赞 → likes=2，liked_by 两人', lGot2.data[0].likes === 2 && lGot2.data[0].liked_by.length === 2);
  const lBad = await api('POST', `/submissions/not-exist/like`, {}, { headers: { 'X-Ty-Uid': 'stu-1' } });
  ok('赞不存在的行 → 404', lBad.status === 404);

  /* update / remove submission */
  const sUpd = await api('PUT', `/submissions/${s1.data.id}`, { data: { px: 999, py: 111, text: '已编辑' } });
  const sUpdGot = await api('GET', `/submissions?board_id=${b1.data.id}`);
  const mine = sUpdGot.data.find(x => x.id === s1.data.id);
  ok('updateSubmission 生效', sUpd.status === 200 && mine.data.px === 999 && mine.data.text === '已编辑');

  /* 级联删除 */
  console.log('— 级联删除 —');
  await api('DELETE', `/boards/${b1.data.id}`);
  const gone = await api('GET', `/boards/${b1.data.id}`);
  const gList = await api('GET', `/submissions?board_id=${b1.data.id}`);
  ok('删互动后 getBoard → 404', gone.status === 404);
  ok('删互动后 submissions 清空（级联）', gList.status === 200 && gList.data.length === 0);

  /* 数据库现已空（最后删课程自证） */
  await api('DELETE', `/courses/${c1.data.id}`);
  await api('DELETE', `/courses/${c2.data.id}`);
  const final = await api('GET', '/courses');
  ok('收尾：课程库清空', final.status === 200 && final.data.length === 0, JSON.stringify(final.data.length));

  console.log(`\n═══ 结果：${PASS} PASS / ${FAIL} FAIL ═══`);
  if (fails.length) { console.log('失败项：'); fails.forEach(f => console.log('  · ' + f)); }
  process.exit(FAIL ? 1 : 0);
}

main().catch(e => { console.error('测试脚本崩溃：', e); process.exit(2); });
