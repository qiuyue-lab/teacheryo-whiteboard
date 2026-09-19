/* TeacherYO API 并发压测 —— 零依赖，node tests/load.mjs [students] [rounds]
 * 场景：
 *  1) N 学生并发交便签（写负载）×R 轮 → 成功率 / P50 / P95 / 行数一致
 *  2) N 学生并发点赞同一条（原子性验证）→ likes 必须等于点赞人数
 *  3) 模拟大屏+学生轮询读（读负载）→ 读 P50 / P95
 */
const BASE = process.env.TY_API || 'http://localhost:8787';
const N = parseInt(process.argv[2] || '30', 10);   // 学生数
const R = parseInt(process.argv[3] || '3', 10);    // 每人提交轮数
const ALL = [];

function pct(a, p) { a.sort((x, y) => x - y); const i = Math.min(a.length - 1, Math.floor(a.length * p / 100)); return a[i]; }
function show(name, lat) {
  console.log(`    ${name}: 成功 ${lat.ok.length}/${lat.ok.length + lat.bad.length}` +
    ` · P50 ${Math.round(pct(lat.ok, 50))}ms · P95 ${Math.round(pct(lat.ok, 95))}ms · max ${Math.round(lat.ok[lat.ok.length - 1] || 0)}ms`);
}

async function req(method, path, body, uid) {
  const t0 = performance.now();
  try {
    const r = await fetch(BASE + path, {
      method, headers: { 'Content-Type': 'application/json', ...(uid ? { 'X-Ty-Uid': uid } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    let data = null; try { data = await r.json(); } catch { }
    const ok = r.status >= 200 && r.status < 300;
    return { ok, status: r.status, data, ms: performance.now() - t0 };
  } catch (e) {
    return { ok: false, status: 0, data: null, ms: performance.now() - t0, err: String(e) };
  }
}

async function concurrent(jobs) { return Promise.all(jobs.map(j => j())); }

async function main() {
  console.log(`\n=== TeacherYO 并发压测 → ${BASE} · ${N} 学生 × ${R} 轮 ===\n`);

  /* 准备：1 课程 + 1 便签墙互动 */
  const c = await req('POST', '/courses', { name: '压测课程' }, 'load-teacher');
  const b = await req('POST', '/boards', { courseId: c.data.id, type: 'notes' }, 'load-teacher');
  const boardId = b.data.id;

  /* ① 写负载：N 学生并发提交 × R 轮 */
  console.log(`— ① 写负载：${N} 学生并发交便签 × ${R} 轮 —`);
  const submitLat = { ok: [], bad: [] };
  const submitJobs = [];
  for (let round = 0; round < R; round++) {
    for (let i = 0; i < N; i++) {
      const uid = `stu-${i}`;
      submitJobs.push(() => req('POST', '/submissions', {
        boardId, type: 'note', author: `学生${i}`,
        data: { px: (i * 37) % 900, py: (i * 53) % 500, text: `第${round}轮·学生${i}的便签`, shape: i % 4 }
      }, uid).then(r => { (r.ok ? submitLat.ok : submitLat.bad).push(r.ms); if (!r.ok) console.log(`    提交失败: ${r.status} ${JSON.stringify(r.data)}`); }));
    }
  }
  await concurrent(submitJobs);
  show(`提交(${N}×${R}=${N * R}条)`, submitLat);
  const after = await req('GET', `/submissions?board_id=${boardId}`);
  ok_cond(after.data.length === N * R, `落库行数一致：${after.data.length} / 期望 ${N * R}`);

  /* ② 原子点赞：N 个不同 uid 并发赞同一条 → likes == N */
  console.log(`— ② 原子点赞：${N} 学生并发赞同一条便签 —`);
  const target = after.data[0];
  const likeLat = { ok: [], bad: [] };
  const likeJobs = [];
  for (let i = 0; i < N; i++) {
    likeJobs.push(() => req('POST', `/submissions/${target.id}/like`, {}, `liker-${i}`)
      .then(r => { (r.ok ? likeLat.ok : likeLat.bad).push(r.ms); if (!r.ok) console.log(`    点赞失败: ${r.status} ${JSON.stringify(r.data)}`); }));
  }
  await concurrent(likeJobs);
  show(`点赞(${N}并发)`, likeLat);
  const likeAfter = (await req('GET', `/submissions?board_id=${boardId}`)).data.find(x => x.id === target.id);
  ok_cond(likeAfter.likes === N && likeAfter.liked_by.length === N, `点赞一致性：likes=${likeAfter.likes} liked_by=${likeAfter.liked_by.length}，期望 ${N}（读改写竞态会丢，原子 SQL 不会）`);

  /* ②b 重复点赞：每个 liker 再点一次（取消一半人）→ likes 精确回落 */
  const unJobs = [];
  for (let i = 0; i < Math.floor(N / 2); i++) {
    unJobs.push(() => req('POST', `/submissions/${target.id}/like`, {}, `liker-${i}`));
  }
  await concurrent(unJobs);
  const likeAfter2 = (await req('GET', `/submissions?board_id=${boardId}`)).data.find(x => x.id === target.id);
  ok_cond(likeAfter2.likes === N - Math.floor(N / 2), `取消一半：likes=${likeAfter2.likes}，期望 ${N - Math.floor(N / 2)}`);

  /* ③ 读负载：5 个轮询者（大屏 1 + 学生 4）× 各 20 次 GET，交错节奏 */
  console.log(`— ③ 读负载：5 轮询者 × 20 次 GET（模拟大屏/学生 2.5s 轮询聚簇）—`);
  const readLat = { ok: [], bad: [] };
  const pollers = [];
  for (let p = 0; p < 5; p++) {
    pollers.push((async () => {
      for (let k = 0; k < 20; k++) {
        const path = (k % 2 === 0) ? `/submissions?board_id=${boardId}` : `/courses`;
        const r = await req('GET', path);
        (r.ok ? readLat.ok : readLat.bad).push(r.ms);
        await new Promise(z => setTimeout(z, 40)); // 轻微交错
      }
    })());
  }
  const t3 = performance.now();
  await Promise.all(pollers);
  console.log(`    读吞吐：100 读 / ${Math.round(performance.now() - t3)}ms = ${Math.round(100000 / (performance.now() - t3))} QPS（本地 dev 含轮询间歇）`);
  show(`轮询读(100次)`, readLat);

  /* 清理 */
  await req('DELETE', `/courses/${c.data.id}`);
  const clean = await req('GET', '/courses');
  ok_cond(clean.data.length === 0, '清理：课程库清空');

  console.log(`\n═══ 压测完成 ═══\n`);
  process.exit(0);
}

function ok_cond(cond, msg) {
  console.log(`    ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) process.exitCode = 1;
}

main().catch(e => { console.error('压测崩溃：', e); process.exit(2); });
