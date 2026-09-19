CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`step` integer DEFAULT 1 NOT NULL,
	`type` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`code` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_boards_course` ON `boards` (`course_id`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`emoji` text DEFAULT '' NOT NULL,
	`cover` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`type` text NOT NULL,
	`part_idx` integer DEFAULT 0 NOT NULL,
	`author` text DEFAULT '匿名同学' NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`liked_by` text DEFAULT '[]' NOT NULL,
	`uid` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_subs_board` ON `submissions` (`board_id`);