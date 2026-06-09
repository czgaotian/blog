ALTER TABLE `media` ADD `sha256_hash` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_sha256_hash_active` ON `media` (`sha256_hash`) WHERE `deleted_at` IS NULL;
