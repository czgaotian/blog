import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from './drizzle-zod-compat';

// Users table for authentication and user management
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  passwordHash: text('password_hash'), // Hashed password, nullable for OAuth users
  role: text('role').notNull().default('viewer'), // 'admin', 'editor', 'author', 'viewer'
  avatar: text('avatar'),
  avatarUrl: text('avatar_url'),
  phone: text('phone'),
  bio: text('bio'),
  timezone: text('timezone').default('UTC'),
  language: text('language').default('en'),
  emailNotifications: integer('email_notifications', { mode: 'boolean' }).default(true),
  theme: text('theme').default('dark'),
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).default(false),
  twoFactorSecret: text('two_factor_secret'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: integer('password_reset_expires'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  emailVerificationToken: text('email_verification_token'),
  invitationToken: text('invitation_token'),
  invitedBy: text('invited_by'),
  invitedAt: integer('invited_at'),
  acceptedInvitationAt: integer('accepted_invitation_at'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: integer('last_login_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('idx_users_email').on(table.email),
  index('idx_users_username').on(table.username),
  index('idx_users_role').on(table.role),
  index('idx_users_email_verification_token').on(table.emailVerificationToken),
  index('idx_users_password_reset_token').on(table.passwordResetToken),
  index('idx_users_invitation_token').on(table.invitationToken),
]);

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  parentId: text('parent_id').references((): any => categories.id),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('idx_categories_slug').on(table.slug),
  index('idx_categories_parent').on(table.parentId),
  index('idx_categories_sort_order').on(table.sortOrder),
]);

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  color: text('color').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('idx_tags_slug').on(table.slug),
]);

// Blog content items.
export const contents = sqliteTable('contents', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  bodyJson: text('body_json', { mode: 'json' }).notNull().default({ type: 'doc', content: [] }),
  bodyHtml: text('body_html').notNull().default(''),
  status: text('status').notNull().default('draft'), // 'draft', 'published', 'archived'
  categoryId: text('category_id').references(() => categories.id),
  coverImageId: text('cover_image_id').references((): any => media.id),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  metadata: text('metadata', { mode: 'json' }).notNull().default({}),
  authorId: text('author_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (table) => [
  uniqueIndex('idx_contents_slug_active').on(table.slug).where(sql`${table.deletedAt} IS NULL`),
  index('idx_contents_status_published').on(table.status, table.publishedAt),
  index('idx_contents_category').on(table.categoryId),
  index('idx_contents_cover_image').on(table.coverImageId),
  index('idx_content_author').on(table.authorId),
  index('idx_content_status').on(table.status),
  index('idx_content_published').on(table.publishedAt),
  index('idx_content_slug').on(table.slug),
  index('idx_content_deleted').on(table.deletedAt),
]);

export const contentTags = sqliteTable('content_tags', {
  contentId: text('content_id').notNull().references(() => contents.id),
  tagId: text('tag_id').notNull().references(() => tags.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('idx_content_tags_content_tag').on(table.contentId, table.tagId),
  index('idx_content_tags_content').on(table.contentId),
  index('idx_content_tags_tag').on(table.tagId),
]);

// Content versions for versioning system
export const contentVersions = sqliteTable('content_versions', {
  id: text('id').primaryKey(),
  contentId: text('content_id').notNull().references(() => contents.id),
  version: integer('version').notNull(),
  data: text('data', { mode: 'json' }).notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_content_versions_content').on(table.contentId),
  index('idx_content_versions_version').on(table.version),
]);

// Media/Files table
export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  r2Key: text('r2_key').notNull(), // R2 storage key
  publicUrl: text('public_url').notNull(), // CDN URL
  thumbnailUrl: text('thumbnail_url'),
  alt: text('alt'),
  caption: text('caption'),
  tags: text('tags', { mode: 'json' }), // JSON array of tags
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
  uploadedAt: integer('uploaded_at').notNull(),
  updatedAt: integer('updated_at'),
  publishedAt: integer('published_at'),
  scheduledAt: integer('scheduled_at'),
  archivedAt: integer('archived_at'),
  deletedAt: integer('deleted_at'),
}, (table) => [
  index('idx_media_type').on(table.mimeType),
  index('idx_media_uploaded_by').on(table.uploadedBy),
  index('idx_media_uploaded_at').on(table.uploadedAt),
  index('idx_media_deleted').on(table.deletedAt),
]);

// Site settings stored as JSON-encoded values.
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  category: text('category').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('idx_settings_category').on(table.category),
  uniqueIndex('idx_settings_category_key').on(table.category, table.key),
]);

export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_activity_logs_user_id').on(table.userId),
  index('idx_activity_logs_created_at').on(table.createdAt),
  index('idx_activity_logs_resource').on(table.resourceType, table.resourceId),
]);

export const passwordHistory = sqliteTable('password_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_password_history_user_id').on(table.userId),
]);

export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  bio: text('bio'),
  company: text('company'),
  jobTitle: text('job_title'),
  website: text('website'),
  location: text('location'),
  dateOfBirth: integer('date_of_birth'),
  data: text('data', { mode: 'json' }).default({}),
  createdAt: integer('created_at').notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at').notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (table) => [
  index('idx_user_profiles_user_id').on(table.userId),
]);

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: (schema: any) => schema.email(),
  firstName: (schema: any) => schema.min(1),
  lastName: (schema: any) => schema.min(1),
  username: (schema: any) => schema.min(3),
});

export const selectUserSchema = createSelectSchema(users);

export const insertContentSchema = createInsertSchema(contents, {
  slug: (schema: any) => schema.min(1).regex(/^[a-zA-Z0-9_-]+$/, 'Slug must contain only letters, numbers, underscores, and hyphens'),
  title: (schema: any) => schema.min(1),
  status: (schema: any) => schema,
});

export const selectContentSchema = createSelectSchema(contents);

export const insertMediaSchema = createInsertSchema(media, {
  filename: (schema: any) => schema.min(1),
  originalName: (schema: any) => schema.min(1),
  mimeType: (schema: any) => schema.min(1),
  size: (schema: any) => schema.positive(),
  r2Key: (schema: any) => schema.min(1),
  publicUrl: (schema: any) => schema.url(),
});

export const selectMediaSchema = createSelectSchema(media);


// System logs table for comprehensive logging
export const systemLogs = sqliteTable('system_logs', {
  id: text('id').primaryKey(),
  level: text('level').notNull(), // 'debug', 'info', 'warn', 'error', 'fatal'
  category: text('category').notNull(), // 'auth', 'api', 'media', 'system', 'security', 'error', etc.
  message: text('message').notNull(),
  data: text('data', { mode: 'json' }), // Additional structured data
  userId: text('user_id').references(() => users.id),
  sessionId: text('session_id'),
  requestId: text('request_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  method: text('method'), // HTTP method for API logs
  url: text('url'), // Request URL for API logs
  statusCode: integer('status_code'), // HTTP status code for API logs
  duration: integer('duration'), // Request duration in milliseconds
  stackTrace: text('stack_trace'), // Error stack trace for error logs
  tags: text('tags', { mode: 'json' }), // Array of tags for categorization
  source: text('source'), // Source component/module that generated the log
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_system_logs_level').on(table.level),
  index('idx_system_logs_category').on(table.category),
  index('idx_system_logs_created_at').on(table.createdAt),
  index('idx_system_logs_user_id').on(table.userId),
  index('idx_system_logs_status_code').on(table.statusCode),
  index('idx_system_logs_source').on(table.source),
]);

// Log configuration table
export const logConfig = sqliteTable('log_config', {
  id: text('id').primaryKey(),
  category: text('category').notNull().unique(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  level: text('level').notNull().default('info'), // minimum log level to store
  retention: integer('retention').notNull().default(30), // days to keep logs
  maxSize: integer('max_size').default(10000), // max number of logs per category
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Insert and select schemas for system logs
export const insertSystemLogSchema = createInsertSchema(systemLogs, {
  level: (schema: any) => schema.min(1),
  category: (schema: any) => schema.min(1),
  message: (schema: any) => schema.min(1),
});

export const selectSystemLogSchema = createSelectSchema(systemLogs);

export const insertLogConfigSchema = createInsertSchema(logConfig, {
  category: (schema: any) => schema.min(1),
  level: (schema: any) => schema.min(1),
});

export const selectLogConfigSchema = createSelectSchema(logConfig);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Content = typeof contents.$inferSelect;
export type NewContent = typeof contents.$inferInsert;
export type ContentTag = typeof contentTags.$inferSelect;
export type NewContentTag = typeof contentTags.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type SystemLog = typeof systemLogs.$inferSelect;
export type NewSystemLog = typeof systemLogs.$inferInsert;
export type LogConfig = typeof logConfig.$inferSelect;
export type NewLogConfig = typeof logConfig.$inferInsert;

// =====================================================
// Security Audit Tables
// =====================================================

export const securityEvents = sqliteTable('security_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  severity: text('severity').notNull().default('info'),
  userId: text('user_id'),
  email: text('email'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  countryCode: text('country_code'),
  requestPath: text('request_path'),
  requestMethod: text('request_method'),
  details: text('details', { mode: 'json' }),
  fingerprint: text('fingerprint'),
  blocked: integer('blocked').notNull().default(0),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
}, (table) => [
  index('idx_security_events_type').on(table.eventType),
  index('idx_security_events_user').on(table.userId),
  index('idx_security_events_email').on(table.email),
  index('idx_security_events_ip').on(table.ipAddress),
  index('idx_security_events_severity').on(table.severity),
  index('idx_security_events_created').on(table.createdAt),
  index('idx_security_events_fingerprint').on(table.fingerprint),
]);

export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  event: text('event').notNull(),
  category: text('category').notNull().default('user-activity'),
  properties: text('properties', { mode: 'json' }),
  userId: text('user_id'),
  sessionId: text('session_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  path: text('path'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
}, (table) => [
  index('idx_analytics_events_event').on(table.event),
  index('idx_analytics_events_category').on(table.category),
  index('idx_analytics_events_user_id').on(table.userId),
  index('idx_analytics_events_session_id').on(table.sessionId),
  index('idx_analytics_events_created_at').on(table.createdAt),
  index('idx_analytics_events_path').on(table.path),
]);

export const insertSecurityEventSchema = createInsertSchema(securityEvents, {
  eventType: (schema: any) => schema.min(1),
  severity: (schema: any) => schema.min(1),
});

export const selectSecurityEventSchema = createSelectSchema(securityEvents);

export type SecurityEventRecord = typeof securityEvents.$inferSelect;
export type NewSecurityEventRecord = typeof securityEvents.$inferInsert;
export type AnalyticsEventRecord = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEventRecord = typeof analyticsEvents.$inferInsert;
