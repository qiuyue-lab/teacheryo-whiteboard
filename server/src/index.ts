/* ============================================================
 * TeacherYO · 数据 API Worker（Drizzle + D1）
 * ============================================================
 * 与前端 js/db.js 云端实现的接口约定：
 *   - 字段 snake_case（course_id / created_at / liked_by / part_idx ...）
 *   - config / data / liked_by 是 JSON（TEXT 存 JSON）
 *   - created_at 为毫秒整数
 *
 * 鉴权：浏览器 localStorage 生成 uid，经 x-ty-uid 头带上（免注册课堂场景）
 * CORS：仅放行 ALLOWED_ORIGINS 白名单内的 Origin
 * 并发：toggleLike 用原子 SQL（likes 自增 + json 条件去重），
 *       D1 单写者队列保证同一行串行，杜绝「读改写」丢点赞。
 * ============================================================ */

import { drizzle } from 'drizzle-orm/d1';
import { eq, asc, desc } from 'drizzle-orm';
import { courses, boards, submissions } from './schema';

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

type DB = ReturnType<typeof drizzle>;

/* ---------- 小工具 ---------- */

function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Ty-Uid',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  if (origin && allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(data: unknown, status = 200, origin: string | null, allowed: string[]): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin, allowed), 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function fail(msg: string, status: number, origin: string | null, allowed: string[]): Response {
  return json({ error: msg }, status, origin, allowed);
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return (b && typeof b === 'object') ? b as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function str(v: unknown, dflt = ''): string { return (v == null ? dflt : String(v)); }

/* patch 白名单：防止客户端乱写主键/时间戳 */
function pickPatch(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

function likedNow(list: unknown, me: string): boolean {
  return Array.isArray(list) && list.indexOf(me) >= 0;
}

/* ============================================================ */

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const origin = req.headers.get('Origin');
    const cors = corsHeaders(origin, allowed);

    /* Origin 白名单外的请求：不带 ACAO 头 + 直接 403（浏览器层也会拦） */
    if (origin && !allowed.includes(origin)) {
      return json({ error: 'origin not allowed' }, 403, origin, allowed);
    }
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(req.url);
    const seg = url.pathname.split('/').filter(Boolean);
    const uid = req.headers.get('x-ty-uid') || '';
    const db = drizzle(env.DB);

    try {
      return await handle(req, env, db, seg, url, uid, origin, allowed);
    } catch (e) {
      const msg = (e instanceof Error) ? e.message : String(e);
      console.error('[ty-api]', msg);
      return fail(msg || 'internal error', 500, origin, allowed);
    }
  }
};

async function handle(
  req: Request, env: Env, db: ReturnType<typeof drizzle>,
  seg: string[], url: URL, uid: string,
  origin: string | null, allowed: string[]
): Promise<Response> {
  const m = req.method;
  const O = origin, A = allowed;
  const [a, id, action] = seg;
  const q = url.searchParams;

  if (m === 'GET' && seg.length === 0) {
    return json({ ok: true, name: 'teacheryo-api' }, 200, O, A);
  }

  /* ================= courses ================= */
  if (a === 'courses') {
    if (m === 'GET' && !id) {
      const rows = await db.select().from(courses).orderBy(desc(courses.created_at));
      return json(rows, 200, O, A);
    }
    if (m === 'GET' && id) {
      const row = (await db.select().from(courses).where(eq(courses.id, id)))[0];
      if (!row) return fail('课程不存在（可能已被删除）', 404, O, A);
      return json(row, 200, O, A);
    }
    if (m === 'POST' && !id) {
      const body = await readBody(req);
      const name = str(body.name).trim();
      if (!name) return fail('课程名不能为空', 400, O, A);
      const rowId = crypto.randomUUID();
      await db.insert(courses).values({
        id: rowId,
        name,
        emoji: str(body.emoji),
        cover: str(body.cover),
        created_at: Date.now(),
        created_by: uid
      });
      return json({ id: rowId }, 200, O, A);
    }
    if (m === 'PUT' && id) {
      const patch = pickPatch(await readBody(req), ['name', 'emoji', 'cover']);
      if (Object.keys(patch).length) {
        await db.update(courses).set(patch as Partial<typeof courses.$inferInsert>).where(eq(courses.id, id));
      }
      return json({ ok: true }, 200, O, A);
    }
    if (m === 'DELETE' && id) {
      /* 手动级联（不依赖外键约束）：submissions → boards → courses */
      await env.DB.prepare(
        `DELETE FROM submissions WHERE board_id IN (SELECT id FROM boards WHERE course_id = ?1)`
      ).bind(id).run();
      await db.delete(boards).where(eq(boards.course_id, id));
      await db.delete(courses).where(eq(courses.id, id));
      return json({ ok: true }, 200, O, A);
    }
    if (m === 'POST' && id && action === 'reorder') {
      /* 拖动排序：按给定顺序重写 step（1..n），漏掉的本课程互动接到末尾 */
      const list = await db.select().from(boards).where(eq(boards.course_id, id)).orderBy(asc(boards.step));
      const body = await readBody(req);
      const mine = new Set(list.map(r => r.id));
      const ids = (Array.isArray(body.orderedIds) ? body.orderedIds as string[] : []).filter(x => mine.has(x));
      const seen = new Set(ids);
      for (const r of list) if (!seen.has(r.id)) ids.push(r.id);
      /* 单条原子 SQL：CASE id WHEN ?2 THEN 1 ... 一次重排 1..n */
      const stmts = ids;
      if (stmts.length) {
        const cases = ids.map((_, i) => `WHEN ?${i + 2} THEN ${i + 1}`).join(' ');
        await env.DB.prepare(
          `UPDATE boards SET step = CASE id ${cases} END WHERE course_id = ?1`
        ).bind(id, ...ids).run();
      }
      return json({ ok: true }, 200, O, A);
    }
  }

  /* ================= boards ================= */
  if (a === 'boards') {
    if (m === 'GET' && id === 'by-code' && action) {
      const code = str(action).trim();
      if (!/^\d{6}$/.test(code)) return json({ board: null }, 200, O, A);
      const hit = (await db.select().from(boards).where(eq(boards.code, code)).limit(1))[0];
      return json({ board: hit || null }, 200, O, A);
    }
    if (m === 'GET' && !id) {
      const courseId = q.get('course_id') || '';
      if (!courseId) return fail('course_id 必填', 400, O, A);
      const rows = await db.select().from(boards).where(eq(boards.course_id, courseId)).orderBy(asc(boards.step));
      return json(rows, 200, O, A);
    }
    if (m === 'GET' && id) {
      const row = (await db.select().from(boards).where(eq(boards.id, id)))[0];
      if (!row) return fail('互动不存在（可能已被删除）', 404, O, A);
      return json(row, 200, O, A);
    }
    if (m === 'POST' && !id) {
      /* createBoard：step = max(step)+1（不是条数+1）；6 位课堂码查重 12 次 */
      const body = await readBody(req);
      const courseId = str(body.courseId);
      if (!courseId) return fail('courseId 必填', 400, O, A);
      const list = await db.select({ step: boards.step }).from(boards).where(eq(boards.course_id, courseId));
      const step = list.reduce((mx, r) => Math.max(mx, r.step || 0), 0) + 1;
      let code = '';
      for (let i = 0; i < 12; i++) {
        const cand = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
        const dup = await db.select({ id: boards.id }).from(boards).where(eq(boards.code, cand)).limit(1);
        if (!dup.length) { code = cand; break; }
      }
      if (!code) code = String(Date.now()).slice(-6);
      const rowId = crypto.randomUUID();
      await db.insert(boards).values({
        id: rowId,
        course_id: courseId,
        step,
        type: str(body.type),
        title: str(body.title),
        status: 'active',
        config: (body.config ?? {}) as Record<string, unknown>,
        created_at: Date.now(),
        created_by: uid,
        code
      });
      return json({ id: rowId, step, code }, 200, O, A);
    }
    if (m === 'PUT' && id && !action) {
      const patch = pickPatch(await readBody(req), ['step', 'title', 'status', 'config']);
      if (Object.keys(patch).length) {
        await db.update(boards).set(patch as Partial<typeof boards.$inferInsert>).where(eq(boards.id, id));
      }
      return json({ ok: true }, 200, O, A);
    }
    if (m === 'DELETE' && id && !action) {
      await db.delete(submissions).where(eq(submissions.board_id, id));
      await db.delete(boards).where(eq(boards.id, id));
      return json({ ok: true }, 200, O, A);
    }
    if (m === 'POST' && id && (action === 'archive' || action === 'reopen')) {
      const status = action === 'archive' ? 'archived' : 'active';
      await db.update(boards).set({ status }).where(eq(boards.id, id));
      return json({ ok: true }, 200, O, A);
    }
    if (m === 'POST' && id && action === 'move') {
      /* 相邻交换 step（旧 moveBoard 行为保留） */
      const body = await readBody(req);
      const courseId = str(body.courseId);
      const dir = Number(body.dir) || 0;
      const list = await db.select().from(boards).where(eq(boards.course_id, courseId)).orderBy(asc(boards.step));
      const i = list.findIndex(r => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return json({ moved: false }, 200, O, A);
      await db.batch([
        db.update(boards).set({ step: list[j].step }).where(eq(boards.id, list[i].id)),
        db.update(boards).set({ step: list[i].step }).where(eq(boards.id, list[j].id))
      ]);
      return json({ moved: true }, 200, O, A);
    }
  }

  /* ================= submissions ================= */
  if (a === 'submissions') {
    if (m === 'GET' && !id) {
      const boardId = q.get('board_id') || '';
      if (!boardId) return fail('board_id 必填', 400, O, A);
      const rows = await db.select().from(submissions)
        .where(eq(submissions.board_id, boardId))
        .orderBy(desc(submissions.created_at)).limit(5000);
      return json(rows, 200, O, A);
    }
    if (m === 'POST' && !id) {
      const body = await readBody(req);
      const rowId = crypto.randomUUID();
      await db.insert(submissions).values({
        id: rowId,
        board_id: str(body.boardId),
        type: str(body.type),
        part_idx: Number(body.partIdx) || 0,
        author: str(body.author) || '匿名同学',
        data: (body.data ?? {}) as Record<string, unknown>,
        likes: 0,
        liked_by: [] as unknown[],
        uid,
        created_at: Date.now()
      });
      return json({ id: rowId }, 200, O, A);
    }
    if (m === 'PUT' && id && !action) {
      const patch = pickPatch(await readBody(req), ['author', 'data', 'part_idx', 'likes', 'liked_by']);
      if (Object.keys(patch).length) {
        await db.update(submissions).set(patch as Partial<typeof submissions.$inferInsert>).where(eq(submissions.id, id));
      }
      return json({ ok: true }, 200, O, A);
    }
    if (m === 'DELETE' && id && !action) {
      await db.delete(submissions).where(eq(submissions.id, id));
      return json({ ok: true }, 200, O, A);
    }
    if (m === 'POST' && id && action === 'like') {
      /* 原子点赞：按 uid 翻转。两条互斥 UPDATE，条件在 WHERE 里：
       * - 已赞：移除 + likes-1（MAX(0,·) 防负）
       * - 未赞：追加 + likes+1
       * 同一 batch = 同一事务，D1 行级串行，并发双击也只记一次。 */
      if (!uid) return fail('缺少 x-ty-uid', 400, O, A);
      const cur = (await db.select({ liked_by: submissions.liked_by }).from(submissions).where(eq(submissions.id, id)))[0];
      if (!cur) return fail('不存在', 404, O, A);
      const wasLiked = likedNow(cur.liked_by, uid);
      if (wasLiked) {
        await env.DB.prepare(
          `UPDATE submissions SET
             likes = MAX(0, likes - 1),
             liked_by = json_set(liked_by, '$',
               (SELECT json_group_array(value) FROM json_each(liked_by) WHERE value != ?1))
           WHERE id = ?2 AND EXISTS (SELECT 1 FROM json_each(liked_by) WHERE value = ?1)`
        ).bind(uid, id).run();
        return json({ liked: false }, 200, O, A);
      }
      await env.DB.prepare(
        `UPDATE submissions SET
           likes = likes + 1,
           liked_by = json_set(liked_by, '$', json_insert(liked_by, '$[#]', ?1))
         WHERE id = ?2 AND NOT EXISTS (SELECT 1 FROM json_each(liked_by) WHERE value = ?1)`
      ).bind(uid, id).run();
      return json({ liked: true }, 200, O, A);
    }
  }

  return json({ error: 'not found' }, 404, O, A);
}
