CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_activity_logs_user_id` ON `activity_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_activity_logs_created_at` ON `activity_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activity_logs_resource` ON `activity_logs` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event` text NOT NULL,
	`category` text DEFAULT 'user-activity' NOT NULL,
	`properties` text,
	`user_id` text,
	`session_id` text,
	`ip_address` text,
	`user_agent` text,
	`path` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analytics_events_event` ON `analytics_events` (`event`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_category` ON `analytics_events` (`category`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_user_id` ON `analytics_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_session_id` ON `analytics_events` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_created_at` ON `analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_path` ON `analytics_events` (`path`);--> statement-breakpoint
CREATE TABLE `content` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`author_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_content_author` ON `content` (`author_id`);--> statement-breakpoint
CREATE INDEX `idx_content_status` ON `content` (`status`);--> statement-breakpoint
CREATE INDEX `idx_content_published` ON `content` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_content_slug` ON `content` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_content_deleted` ON `content` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `content_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`version` integer NOT NULL,
	`data` text NOT NULL,
	`author_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_content_versions_content` ON `content_versions` (`content_id`);--> statement-breakpoint
CREATE INDEX `idx_content_versions_version` ON `content_versions` (`version`);--> statement-breakpoint
CREATE TABLE `log_config` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`retention` integer DEFAULT 30 NOT NULL,
	`max_size` integer DEFAULT 10000,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `log_config_category_unique` ON `log_config` (`category`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`folder` text DEFAULT 'uploads' NOT NULL,
	`r2_key` text NOT NULL,
	`public_url` text NOT NULL,
	`thumbnail_url` text,
	`alt` text,
	`caption` text,
	`tags` text,
	`uploaded_by` text NOT NULL,
	`uploaded_at` integer NOT NULL,
	`updated_at` integer,
	`published_at` integer,
	`scheduled_at` integer,
	`archived_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_media_folder` ON `media` (`folder`);--> statement-breakpoint
CREATE INDEX `idx_media_type` ON `media` (`mime_type`);--> statement-breakpoint
CREATE INDEX `idx_media_uploaded_by` ON `media` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `idx_media_uploaded_at` ON `media` (`uploaded_at`);--> statement-breakpoint
CREATE INDEX `idx_media_deleted` ON `media` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `password_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_password_history_user_id` ON `password_history` (`user_id`);--> statement-breakpoint
CREATE TABLE `security_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`severity` text DEFAULT 'info' NOT NULL,
	`user_id` text,
	`email` text,
	`ip_address` text,
	`user_agent` text,
	`country_code` text,
	`request_path` text,
	`request_method` text,
	`details` text,
	`fingerprint` text,
	`blocked` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_security_events_type` ON `security_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_security_events_user` ON `security_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_security_events_email` ON `security_events` (`email`);--> statement-breakpoint
CREATE INDEX `idx_security_events_ip` ON `security_events` (`ip_address`);--> statement-breakpoint
CREATE INDEX `idx_security_events_severity` ON `security_events` (`severity`);--> statement-breakpoint
CREATE INDEX `idx_security_events_created` ON `security_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_security_events_fingerprint` ON `security_events` (`fingerprint`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_settings_category` ON `settings` (`category`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_settings_category_key` ON `settings` (`category`,`key`);--> statement-breakpoint
CREATE TABLE `system_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`level` text NOT NULL,
	`category` text NOT NULL,
	`message` text NOT NULL,
	`data` text,
	`user_id` text,
	`session_id` text,
	`request_id` text,
	`ip_address` text,
	`user_agent` text,
	`method` text,
	`url` text,
	`status_code` integer,
	`duration` integer,
	`stack_trace` text,
	`tags` text,
	`source` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_system_logs_level` ON `system_logs` (`level`);--> statement-breakpoint
CREATE INDEX `idx_system_logs_category` ON `system_logs` (`category`);--> statement-breakpoint
CREATE INDEX `idx_system_logs_created_at` ON `system_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_system_logs_user_id` ON `system_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_system_logs_status_code` ON `system_logs` (`status_code`);--> statement-breakpoint
CREATE INDEX `idx_system_logs_source` ON `system_logs` (`source`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text,
	`bio` text,
	`company` text,
	`job_title` text,
	`website` text,
	`location` text,
	`date_of_birth` integer,
	`data` text DEFAULT '{}',
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_user_id_unique` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_profiles_user_id` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`password_hash` text,
	`role` text DEFAULT 'viewer' NOT NULL,
	`avatar` text,
	`avatar_url` text,
	`phone` text,
	`bio` text,
	`timezone` text DEFAULT 'UTC',
	`language` text DEFAULT 'en',
	`email_notifications` integer DEFAULT true,
	`theme` text DEFAULT 'dark',
	`two_factor_enabled` integer DEFAULT false,
	`two_factor_secret` text,
	`password_reset_token` text,
	`password_reset_expires` integer,
	`email_verified` integer DEFAULT false,
	`email_verification_token` text,
	`invitation_token` text,
	`invited_by` text,
	`invited_at` integer,
	`accepted_invitation_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_username` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `idx_users_email_verification_token` ON `users` (`email_verification_token`);--> statement-breakpoint
CREATE INDEX `idx_users_password_reset_token` ON `users` (`password_reset_token`);--> statement-breakpoint
CREATE INDEX `idx_users_invitation_token` ON `users` (`invitation_token`);
