import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

/* 属性名与列名一律 snake_case：与旧 PostgreSQL 版严格一致，
 * 前端（index.html / common.js / student.html）零改动。 */

export const courses = sqliteTable('courses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default(''),
  cover: text('cover').notNull().default(''),
  created_at: integer('created_at').notNull(),
  created_by: text('created_by').notNull().default('')
});

export const boards = sqliteTable('boards', {
  id: text('id').primaryKey(),
  course_id: text('course_id').notNull(),
  step: integer('step').notNull().default(1),
  type: text('type').notNull(),
  title: text('title').notNull().default(''),
  status: text('status').notNull().default('active'),
  /* config/data/liked_by 对应旧 jsonb：TEXT 存 JSON，mode json 自动序列化 */
  config: text('config', { mode: 'json' }).notNull().default({}),
  created_at: integer('created_at').notNull(),
  created_by: text('created_by').notNull().default(''),
  /* 6 位数字课堂码（学生扫码入口 /student.html?c=code），靠应用层查重保证唯一 */
  code: text('code').notNull().default('')
}, (t) => [index('idx_boards_course').on(t.course_id)]);

export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(),
  board_id: text('board_id').notNull(),
  type: text('type').notNull(),
  part_idx: integer('part_idx').notNull().default(0),
  author: text('author').notNull().default('匿名同学'),
  data: text('data', { mode: 'json' }).notNull().default({}),
  likes: integer('likes').notNull().default(0),
  liked_by: text('liked_by', { mode: 'json' }).notNull().default([]),
  uid: text('uid').notNull().default(''),
  created_at: integer('created_at').notNull()
}, (t) => [index('idx_subs_board').on(t.board_id)]);
