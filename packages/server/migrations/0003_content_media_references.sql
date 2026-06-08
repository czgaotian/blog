CREATE TABLE `content_media_references` (
	`content_id` text NOT NULL,
	`media_id` text NOT NULL,
	`usage_type` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`content_id`, `media_id`, `usage_type`),
	FOREIGN KEY (`content_id`) REFERENCES `contents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_content_media_references_content` ON `content_media_references` (`content_id`);
--> statement-breakpoint
CREATE INDEX `idx_content_media_references_media` ON `content_media_references` (`media_id`);
