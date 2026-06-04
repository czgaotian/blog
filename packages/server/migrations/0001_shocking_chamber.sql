DROP INDEX `idx_contents_type_slug`;--> statement-breakpoint
DROP INDEX `idx_contents_type_status_published`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_contents_slug_active` ON `contents` (`slug`) WHERE "contents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `idx_contents_status_published` ON `contents` (`status`,`published_at`);--> statement-breakpoint
ALTER TABLE `contents` DROP COLUMN `type`;--> statement-breakpoint
UPDATE `content_versions` SET `data` = json_remove(`data`, '$.type') WHERE json_valid(`data`);
