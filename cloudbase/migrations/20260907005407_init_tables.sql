-- ============================================================
-- TeacherYO 初始化：三张核心表 + RLS 行级安全
-- 环境：CloudBase PG（PostgreSQL 17）
-- ============================================================

CREATE TABLE courses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  emoji      text NOT NULL DEFAULT '',
  cover      text NOT NULL DEFAULT '',
  created_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint,
  created_by text NOT NULL DEFAULT ''
);

CREATE TABLE boards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  step       integer NOT NULL DEFAULT 1,
  type       text NOT NULL,
  title      text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT 'active',
  config     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint,
  created_by text NOT NULL DEFAULT ''
);
CREATE INDEX idx_boards_course ON boards(course_id);

CREATE TABLE submissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  type       text NOT NULL,
  part_idx   integer NOT NULL DEFAULT 0,
  author     text NOT NULL DEFAULT '匿名同学',
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  likes      integer NOT NULL DEFAULT 0,
  liked_by   jsonb NOT NULL DEFAULT '[]'::jsonb,
  uid        text NOT NULL DEFAULT '',
  created_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint
);
CREATE INDEX idx_subs_board ON submissions(board_id);

-- ================= 权限（MVP：宽松，课堂可信环境） =================
-- 角色说明：anon = 扫码未登录；authenticated = 匿名登录后
-- courses/boards 仅登录者可写；submissions 开放 anon 读写（学生扫码即答）
-- 生产收紧建议见 README 第 4 节
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON courses, boards, submissions TO authenticated;
GRANT SELECT ON courses, boards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON submissions TO anon;

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY courses_anon_select ON courses FOR SELECT TO anon USING (true);
CREATE POLICY courses_auth_all    ON courses FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY boards_anon_select  ON boards  FOR SELECT TO anon USING (true);
CREATE POLICY boards_auth_all     ON boards  FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY submissions_all     ON submissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
