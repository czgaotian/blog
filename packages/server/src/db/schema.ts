import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
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
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: integer('last_login_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Content collections - dynamic schema definitions
export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  schema: text('schema', { mode: 'json' }).notNull(), // JSON schema definition
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Content items - actual content data
export const content = sqliteTable('content', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id').notNull().references(() => collections.id),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  data: text('data', { mode: 'json' }).notNull(), // JSON content data
  status: text('status').notNull().default('draft'), // 'draft', 'published', 'archived'
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  authorId: text('author_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Content versions for versioning system
export const contentVersions = sqliteTable('content_versions', {
  id: text('id').primaryKey(),
  contentId: text('content_id').notNull().references(() => content.id),
  version: integer('version').notNull(),
  data: text('data', { mode: 'json' }).notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Media/Files table
export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  folder: text('folder').notNull().default('uploads'),
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
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: (schema: any) => schema.email(),
  firstName: (schema: any) => schema.min(1),
  lastName: (schema: any) => schema.min(1),
  username: (schema: any) => schema.min(3),
});

export const selectUserSchema = createSelectSchema(users);

export const insertCollectionSchema = createInsertSchema(collections, {
  name: (schema: any) => schema.min(1).regex(/^[a-z0-9_]+$/, 'Collection name must be lowercase with underscores'),
  displayName: (schema: any) => schema.min(1),
});

export const selectCollectionSchema = createSelectSchema(collections);

export const insertContentSchema = createInsertSchema(content, {
  slug: (schema: any) => schema.min(1).regex(/^[a-zA-Z0-9_-]+$/, 'Slug must contain only letters, numbers, underscores, and hyphens'),
  title: (schema: any) => schema.min(1),
  status: (schema: any) => schema,
});

export const selectContentSchema = createSelectSchema(content);

export const insertMediaSchema = createInsertSchema(media, {
  filename: (schema: any) => schema.min(1),
  originalName: (schema: any) => schema.min(1),
  mimeType: (schema: any) => schema.min(1),
  size: (schema: any) => schema.positive(),
  r2Key: (schema: any) => schema.min(1),
  publicUrl: (schema: any) => schema.url(),
  folder: (schema: any) => schema.min(1),
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
});

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
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type Content = typeof content.$inferSelect;
export type NewContent = typeof content.$inferInsert;
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
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents, {
  eventType: (schema: any) => schema.min(1),
  severity: (schema: any) => schema.min(1),
});

export const selectSecurityEventSchema = createSelectSchema(securityEvents);

export type SecurityEventRecord = typeof securityEvents.$inferSelect;
export type NewSecurityEventRecord = typeof securityEvents.$inferInsert;
