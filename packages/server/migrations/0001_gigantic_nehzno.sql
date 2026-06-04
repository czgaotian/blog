DROP INDEX `idx_contents_type_slug`;--> statement-breakpoint
DROP INDEX `idx_contents_type_status_published`;--> statement-breakpoint
ALTER TABLE `contents` ADD `cover_image_id` text REFERENCES media(id);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_contents_slug_active` ON `contents` (`slug`) WHERE "contents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `idx_contents_status_published` ON `contents` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_contents_cover_image` ON `contents` (`cover_image_id`);--> statement-breakpoint
ALTER TABLE `contents` DROP COLUMN `type`;--> statement-breakpoint
UPDATE `content_versions` SET `data` = json_remove(`data`, '$.type') WHERE json_valid(`data`);
