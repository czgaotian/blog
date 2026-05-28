export interface BundledMigration {
  id: string
  name: string
  filename: string
  description?: string
  sql: string
}

export const bundledMigrations: BundledMigration[] = [
  {
    id: "001",
    name: "Initial Schema",
    filename: "001_initial_schema.sql",
    sql: "-- Initial lightweight CMS schema\n\nCREATE TABLE IF NOT EXISTS users (\n  id TEXT PRIMARY KEY,\n  email TEXT NOT NULL UNIQUE,\n  username TEXT NOT NULL UNIQUE,\n  first_name TEXT NOT NULL,\n  last_name TEXT NOT NULL,\n  password_hash TEXT,\n  role TEXT NOT NULL DEFAULT 'viewer',\n  avatar TEXT,\n  is_active INTEGER NOT NULL DEFAULT 1,\n  last_login_at INTEGER,\n  created_at INTEGER NOT NULL,\n  updated_at INTEGER NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS collections (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL UNIQUE,\n  display_name TEXT NOT NULL,\n  description TEXT,\n  schema TEXT NOT NULL,\n  is_active INTEGER NOT NULL DEFAULT 1,\n  created_at INTEGER NOT NULL,\n  updated_at INTEGER NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS content (\n  id TEXT PRIMARY KEY,\n  collection_id TEXT NOT NULL REFERENCES collections(id),\n  slug TEXT NOT NULL,\n  title TEXT NOT NULL,\n  data TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'draft',\n  published_at INTEGER,\n  author_id TEXT NOT NULL REFERENCES users(id),\n  created_at INTEGER NOT NULL,\n  updated_at INTEGER NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS content_versions (\n  id TEXT PRIMARY KEY,\n  content_id TEXT NOT NULL REFERENCES content(id),\n  version INTEGER NOT NULL,\n  data TEXT NOT NULL,\n  author_id TEXT NOT NULL REFERENCES users(id),\n  created_at INTEGER NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS media (\n  id TEXT PRIMARY KEY,\n  filename TEXT NOT NULL,\n  original_name TEXT NOT NULL,\n  mime_type TEXT NOT NULL,\n  size INTEGER NOT NULL,\n  width INTEGER,\n  height INTEGER,\n  folder TEXT NOT NULL DEFAULT 'uploads',\n  r2_key TEXT NOT NULL,\n  public_url TEXT NOT NULL,\n  thumbnail_url TEXT,\n  alt TEXT,\n  caption TEXT,\n  tags TEXT,\n  uploaded_by TEXT NOT NULL REFERENCES users(id),\n  uploaded_at INTEGER NOT NULL,\n  updated_at INTEGER,\n  published_at INTEGER,\n  scheduled_at INTEGER,\n  archived_at INTEGER,\n  deleted_at INTEGER\n);\n\nCREATE INDEX IF NOT EXISTS idx_users_email ON users(email);\nCREATE INDEX IF NOT EXISTS idx_users_username ON users(username);\nCREATE INDEX IF NOT EXISTS idx_users_role ON users(role);\nCREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name);\nCREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_active);\nCREATE INDEX IF NOT EXISTS idx_content_collection ON content(collection_id);\nCREATE INDEX IF NOT EXISTS idx_content_author ON content(author_id);\nCREATE INDEX IF NOT EXISTS idx_content_status ON content(status);\nCREATE INDEX IF NOT EXISTS idx_content_published ON content(published_at);\nCREATE INDEX IF NOT EXISTS idx_content_slug ON content(slug);\nCREATE INDEX IF NOT EXISTS idx_content_versions_content ON content_versions(content_id);\nCREATE INDEX IF NOT EXISTS idx_content_versions_version ON content_versions(version);\nCREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder);\nCREATE INDEX IF NOT EXISTS idx_media_type ON media(mime_type);\nCREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media(uploaded_by);\nCREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON media(uploaded_at);\nCREATE INDEX IF NOT EXISTS idx_media_deleted ON media(deleted_at);\n",
  },
  {
    id: "002",
    name: "Faq Plugin",
    filename: "002_faq_plugin.sql",
    sql: "-- Legacy FAQ plugin removed from lightweight CMS core.\nSELECT 1;\n",
  },
  {
    id: "003",
    name: "Stage5 Enhancements",
    filename: "003_stage5_enhancements.sql",
    sql: "-- Lightweight CMS collection field definitions.\n\nCREATE TABLE IF NOT EXISTS content_fields (\n  id TEXT PRIMARY KEY,\n  collection_id TEXT NOT NULL REFERENCES collections(id),\n  field_name TEXT NOT NULL,\n  field_type TEXT NOT NULL,\n  field_label TEXT NOT NULL,\n  field_options TEXT,\n  field_order INTEGER NOT NULL DEFAULT 0,\n  is_required INTEGER NOT NULL DEFAULT 0,\n  is_searchable INTEGER NOT NULL DEFAULT 0,\n  created_at INTEGER NOT NULL,\n  updated_at INTEGER NOT NULL,\n  UNIQUE(collection_id, field_name)\n);\n\nCREATE INDEX IF NOT EXISTS idx_content_fields_collection ON content_fields(collection_id);\nCREATE INDEX IF NOT EXISTS idx_content_fields_name ON content_fields(field_name);\nCREATE INDEX IF NOT EXISTS idx_content_fields_type ON content_fields(field_type);\nCREATE INDEX IF NOT EXISTS idx_content_fields_order ON content_fields(field_order);\n",
  },
  {
    id: "004",
    name: "Stage6 User Management",
    filename: "004_stage6_user_management.sql",
    sql: "-- Lightweight user profile columns and audit tables.\n\nALTER TABLE users ADD COLUMN phone TEXT;\nALTER TABLE users ADD COLUMN bio TEXT;\nALTER TABLE users ADD COLUMN avatar_url TEXT;\nALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'UTC';\nALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en';\nALTER TABLE users ADD COLUMN email_notifications INTEGER DEFAULT 1;\nALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'dark';\nALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;\nALTER TABLE users ADD COLUMN two_factor_secret TEXT;\nALTER TABLE users ADD COLUMN password_reset_token TEXT;\nALTER TABLE users ADD COLUMN password_reset_expires INTEGER;\nALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;\nALTER TABLE users ADD COLUMN email_verification_token TEXT;\nALTER TABLE users ADD COLUMN invitation_token TEXT;\nALTER TABLE users ADD COLUMN invited_by TEXT REFERENCES users(id);\nALTER TABLE users ADD COLUMN invited_at INTEGER;\nALTER TABLE users ADD COLUMN accepted_invitation_at INTEGER;\n\nCREATE TABLE IF NOT EXISTS activity_logs (\n  id TEXT PRIMARY KEY,\n  user_id TEXT REFERENCES users(id),\n  action TEXT NOT NULL,\n  resource_type TEXT,\n  resource_id TEXT,\n  details TEXT,\n  ip_address TEXT,\n  user_agent TEXT,\n  created_at INTEGER NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS password_history (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  password_hash TEXT NOT NULL,\n  created_at INTEGER NOT NULL\n);\n\nCREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);\nCREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);\nCREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);\nCREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);\nCREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);\nCREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);\nCREATE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token);\n",
  },
  {
    id: "005",
    name: "Stage7 Workflow Automation",
    filename: "005_stage7_workflow_automation.sql",
    sql: "-- Workflow and automation removed from lightweight CMS core.\nSELECT 1;\n",
  },
  {
    id: "006",
    name: "Plugin System",
    filename: "006_plugin_system.sql",
    sql: "-- Migration 006: Plugin System Removed\n-- Plugin platform metadata has been removed. This migration is kept as a no-op\n-- so existing migration ordering remains stable.\nSELECT 1;\n",
  },
  {
    id: "007",
    name: "Demo Login Plugin",
    filename: "007_demo_login_plugin.sql",
    sql: "-- Migration 007: Demo Login Plugin Registry Removed\n-- Plugin platform metadata has been removed. This migration is kept as a no-op\n-- so existing migration ordering remains stable.\nSELECT 1;\n",
  },
  {
    id: "008",
    name: "Fix Slug Validation",
    filename: "008_fix_slug_validation.sql",
    sql: "-- Migration: Fix overly restrictive slug validation patterns\n-- This migration relaxes the slug field validation to be more user-friendly\n\n-- Update the pages collection slug field to allow underscores and be less restrictive\nUPDATE content_fields \nSET field_options = '{\"pattern\": \"^[a-zA-Z0-9_-]+$\", \"placeholder\": \"url-friendly-slug\", \"help\": \"Use letters, numbers, underscores, and hyphens only\"}'\nWHERE field_name = 'slug' AND collection_id = 'pages-collection';\n\n-- Update blog posts slug field if it exists\nUPDATE content_fields \nSET field_options = '{\"pattern\": \"^[a-zA-Z0-9_-]+$\", \"placeholder\": \"url-friendly-slug\", \"help\": \"Use letters, numbers, underscores, and hyphens only\"}'\nWHERE field_name = 'slug' AND collection_id = 'blog-posts-collection';\n\n-- Update news slug field if it exists\nUPDATE content_fields \nSET field_options = '{\"pattern\": \"^[a-zA-Z0-9_-]+$\", \"placeholder\": \"url-friendly-slug\", \"help\": \"Use letters, numbers, underscores, and hyphens only\"}'\nWHERE field_name = 'slug' AND collection_id = 'news-collection';\n\n-- Update any other slug fields with the restrictive pattern\nUPDATE content_fields \nSET field_options = REPLACE(field_options, '\"pattern\": \"^[a-z0-9-]+$\"', '\"pattern\": \"^[a-zA-Z0-9_-]+$\"')\nWHERE field_options LIKE '%\"pattern\": \"^[a-z0-9-]+$\"%';",
  },
  {
    id: "009",
    name: "System Logging",
    filename: "009_system_logging.sql",
    sql: "-- System Logging Tables\n-- Migration: 009_system_logging\n-- Description: Add system logging and configuration tables\n\n-- System logs table for tracking application events\nCREATE TABLE IF NOT EXISTS system_logs (\n    id TEXT PRIMARY KEY,\n    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),\n    category TEXT NOT NULL CHECK (category IN ('auth', 'api', 'media', 'system', 'security', 'error')),\n    message TEXT NOT NULL,\n    data TEXT,  -- JSON data\n    user_id TEXT,\n    session_id TEXT,\n    request_id TEXT,\n    ip_address TEXT,\n    user_agent TEXT,\n    method TEXT,\n    url TEXT,\n    status_code INTEGER,\n    duration INTEGER,  -- milliseconds\n    stack_trace TEXT,\n    tags TEXT,  -- JSON array\n    source TEXT,  -- source of the log entry\n    created_at INTEGER NOT NULL DEFAULT (unixepoch()),\n    FOREIGN KEY (user_id) REFERENCES users(id)\n);\n\n-- Log configuration table for managing log settings per category\nCREATE TABLE IF NOT EXISTS log_config (\n    id TEXT PRIMARY KEY,\n    category TEXT NOT NULL UNIQUE CHECK (category IN ('auth', 'api', 'media', 'system', 'security', 'error')),\n    enabled BOOLEAN NOT NULL DEFAULT TRUE,\n    level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),\n    retention_days INTEGER NOT NULL DEFAULT 30,\n    max_size_mb INTEGER NOT NULL DEFAULT 100,\n    created_at INTEGER NOT NULL DEFAULT (unixepoch()),\n    updated_at INTEGER NOT NULL DEFAULT (unixepoch())\n);\n\n-- Create indexes for better performance\nCREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);\nCREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);\nCREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);\nCREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);\nCREATE INDEX IF NOT EXISTS idx_system_logs_status_code ON system_logs(status_code);\nCREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source);\n\n-- Insert default log configurations\nINSERT OR IGNORE INTO log_config (id, category, enabled, level, retention_days, max_size_mb) VALUES\n('log-config-auth', 'auth', TRUE, 'info', 90, 50),\n('log-config-api', 'api', TRUE, 'info', 30, 100),\n('log-config-media', 'media', TRUE, 'info', 30, 50),\n('log-config-system', 'system', TRUE, 'info', 90, 100),\n('log-config-security', 'security', TRUE, 'warn', 180, 100),\n('log-config-error', 'error', TRUE, 'error', 90, 200);\n",
  },
  {
    id: "010",
    name: "Oauth Accounts",
    filename: "010_oauth_accounts.sql",
    sql: "-- OAuth login removed from lightweight CMS core.\nSELECT 1;\n",
  },
  {
    id: "011",
    name: "Config Managed Collections",
    filename: "011_config_managed_collections.sql",
    sql: "-- Migration: Add Config-Managed Collections Support\n-- Description: Add 'managed' column to collections table to support config-based collection definitions\n-- Created: 2025-10-03\n\n-- Add 'managed' column to collections table\n-- This column indicates whether a collection is managed by configuration files (true) or user-created (false)\n-- Managed collections cannot be edited through the admin UI\n-- Use a safe approach to add the column only if it doesn't exist\nALTER TABLE collections ADD COLUMN managed INTEGER DEFAULT 0 NOT NULL;\n\n-- Create an index on the managed column for faster queries\nCREATE INDEX IF NOT EXISTS idx_collections_managed ON collections(managed);\n\n-- Create an index on managed + is_active for efficient filtering\nCREATE INDEX IF NOT EXISTS idx_collections_managed_active ON collections(managed, is_active);\n",
  },
  {
    id: "012",
    name: "Testimonials Plugin",
    filename: "012_testimonials_plugin.sql",
    sql: "-- Legacy testimonials plugin removed from lightweight CMS core.\nSELECT 1;\n",
  },
  {
    id: "013",
    name: "Code Examples Plugin",
    filename: "013_code_examples_plugin.sql",
    sql: "-- Legacy code examples plugin removed from lightweight CMS core.\nSELECT 1;\n",
  },
  {
    id: "014",
    name: "Fix Plugin Registry",
    filename: "014_fix_plugin_registry.sql",
    sql: "-- Migration 014: Plugin Registry Fix Removed\n-- Plugin platform metadata has been removed. This migration is kept as a no-op\n-- so existing migration ordering remains stable.\nSELECT 1;\n",
  },
  {
    id: "015",
    name: "Add Remaining Plugins",
    filename: "015_add_remaining_plugins.sql",
    sql: "-- Migration 015: Remaining Plugin Registry Removed\n-- Plugin platform metadata has been removed. This migration is kept as a no-op\n-- so existing migration ordering remains stable.\nSELECT 1;\n",
  },
  {
    id: "016",
    name: "Remove Duplicate Cache Plugin",
    filename: "016_remove_duplicate_cache_plugin.sql",
    sql: "-- Migration 016: Duplicate Cache Plugin Cleanup Removed\n-- Plugin platform metadata has been removed. This migration is kept as a no-op\n-- so existing migration ordering remains stable.\nSELECT 1;\n",
  },
  {
    id: "017",
    name: "Auth Configurable Fields",
    filename: "017_auth_configurable_fields.sql",
    sql: "-- Migration 017: Auth Plugin Settings Removed\n-- Plugin platform metadata has been removed. This migration is kept as a no-op\n-- so existing migration ordering remains stable.\nSELECT 1;\n",
  },
  {
    id: "018",
    name: "Settings Table",
    filename: "018_settings_table.sql",
    sql: "-- Create settings table for storing application settings\nCREATE TABLE IF NOT EXISTS settings (\n  id TEXT PRIMARY KEY,\n  category TEXT NOT NULL, -- 'general', 'appearance', 'security', etc.\n  key TEXT NOT NULL,\n  value TEXT NOT NULL, -- JSON value\n  created_at INTEGER NOT NULL,\n  updated_at INTEGER NOT NULL,\n  UNIQUE(category, key)\n);\n\n-- Insert default general settings\nINSERT OR IGNORE INTO settings (id, category, key, value, created_at, updated_at)\nVALUES\n  (lower(hex(randomblob(16))), 'general', 'siteName', '\"Worker Blog\"', unixepoch() * 1000, unixepoch() * 1000),\n  (lower(hex(randomblob(16))), 'general', 'siteDescription', '\"A modern headless CMS powered by AI\"', unixepoch() * 1000, unixepoch() * 1000),\n  (lower(hex(randomblob(16))), 'general', 'timezone', '\"UTC\"', unixepoch() * 1000, unixepoch() * 1000),\n  (lower(hex(randomblob(16))), 'general', 'language', '\"en\"', unixepoch() * 1000, unixepoch() * 1000),\n  (lower(hex(randomblob(16))), 'general', 'maintenanceMode', 'false', unixepoch() * 1000, unixepoch() * 1000);\n\n-- Create index for faster lookups\nCREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);\nCREATE INDEX IF NOT EXISTS idx_settings_category_key ON settings(category, key);\n",
  },
  {
    id: "019",
    name: "Remove Blog Posts Collection",
    filename: "019_remove_blog_posts_collection.sql",
    sql: "-- Migration: Remove legacy blog_posts seed collection\n-- Description: Remove the old blog-posts-collection seed data from pre-lightweight installs.\n-- Created: 2025-11-04\n\n-- Delete content associated with blog-posts-collection\nDELETE FROM content WHERE collection_id = 'blog-posts-collection';\n\n-- Delete content fields for blog-posts-collection\nDELETE FROM content_fields WHERE collection_id = 'blog-posts-collection';\n\n-- Delete the blog-posts collection itself\nDELETE FROM collections WHERE id = 'blog-posts-collection';\n\n-- New installs define collections from the admin UI.\n",
  },
  {
    id: "020",
    name: "Add Email Plugin",
    filename: "020_add_email_plugin.sql",
    sql: "-- Migration 020: Email Plugin Registry Removed\n-- Plugin platform metadata has been removed. This migration is kept as a no-op\n-- so existing migration ordering remains stable.\nSELECT 1;\n",
  },
  {
    id: "021",
    name: "Add Magic Link Auth Plugin",
    filename: "021_add_magic_link_auth_plugin.sql",
    sql: "-- Magic link auth removed from lightweight CMS core.\nSELECT 1;\n",
  },
  {
    id: "022",
    name: "Add Tinymce Plugin",
    filename: "022_add_tinymce_plugin.sql",
    sql: "-- Migration 022: TinyMCE Plugin Registry Removed\n-- Plugin platform metadata has been removed. This migration is kept as a no-op\n-- so existing migration ordering remains stable.\nSELECT 1;\n",
  },
  {
    id: "023",
    name: "Add Easy Mdx Plugin",
    filename: "023_add_easy_mdx_plugin.sql",
    sql: "-- Migration 023: EasyMDE Plugin Registry Removed\n-- Plugin platform metadata has been removed. This migration is kept as a no-op\n-- so existing migration ordering remains stable.\nSELECT 1;\n",
  },
  {
    id: "024",
    name: "Add Quill Editor Plugin",
    filename: "024_add_quill_editor_plugin.sql",
    sql: "-- Migration 024: Quill Plugin Registry Removed\n-- Plugin platform metadata has been removed. This migration is kept as a no-op\n-- so existing migration ordering remains stable.\nSELECT 1;\n",
  },
  {
    id: "025",
    name: "Add Easymde Plugin",
    filename: "025_add_easymde_plugin.sql",
    sql: "-- Migration 025: EasyMDE Editor Plugin Registry Removed\n-- Plugin platform metadata has been removed. This migration is kept as a no-op\n-- so existing migration ordering remains stable.\nSELECT 1;\n",
  },
  {
    id: "026",
    name: "Add Otp Login",
    filename: "026_add_otp_login.sql",
    sql: "-- OTP auth removed from lightweight CMS core.\nSELECT 1;\n",
  },
  {
    id: "027",
    name: "Fix Slug Field Type",
    filename: "027_fix_slug_field_type.sql",
    sql: "-- Migration: Fix slug field type\n-- Description: Update slug fields to use 'slug' field type instead of 'text' for proper auto-generation\n-- Created: 2026-01-10\n\n-- Update pages collection slug field to use 'slug' field type\nUPDATE content_fields \nSET field_type = 'slug'\nWHERE field_name = 'slug' AND collection_id = 'pages-collection';\n\n-- Update blog posts slug field if it exists\nUPDATE content_fields \nSET field_type = 'slug'\nWHERE field_name = 'slug' AND collection_id = 'blog-posts-collection';\n\n-- Update news slug field if it exists\nUPDATE content_fields \nSET field_type = 'slug'\nWHERE field_name = 'slug' AND collection_id = 'news-collection';\n",
  },
  {
    id: "028",
    name: "Fix Slug Field Type In Schemas",
    filename: "028_fix_slug_field_type_in_schemas.sql",
    sql: "-- Migration: Fix slug field type in collection schemas\n-- Description: Update slug fields in collection schemas to use 'slug' type instead of 'string'\n-- Created: 2026-01-10\n\n-- Update pages-collection schema\nUPDATE collections \nSET schema = REPLACE(\n  schema,\n  '\"slug\":{\"type\":\"string\"',\n  '\"slug\":{\"type\":\"slug\"'\n)\nWHERE id = 'pages-collection' AND schema LIKE '%\"slug\":{\"type\":\"string\"%';\n\n-- Update blog-posts-collection schema if it exists\nUPDATE collections \nSET schema = REPLACE(\n  schema,\n  '\"slug\":{\"type\":\"string\"',\n  '\"slug\":{\"type\":\"slug\"'\n)\nWHERE id = 'blog-posts-collection' AND schema LIKE '%\"slug\":{\"type\":\"string\"%';\n\n-- Update news-collection schema if it exists\nUPDATE collections \nSET schema = REPLACE(\n  schema,\n  '\"slug\":{\"type\":\"string\"',\n  '\"slug\":{\"type\":\"slug\"'\n)\nWHERE id = 'news-collection' AND schema LIKE '%\"slug\":{\"type\":\"string\"%';\n",
  },
  {
    id: "029",
    name: "Add Forms System",
    filename: "029_add_forms_system.sql",
    sql: "-- Forms system removed from lightweight CMS core.\nSELECT 1;\n",
  },
  {
    id: "030",
    name: "Add Turnstile To Forms",
    filename: "030_add_turnstile_to_forms.sql",
    sql: "-- Turnstile form integration removed with the forms system.\nSELECT 1;\n",
  },
  {
    id: "031",
    name: "Ai Search Plugin",
    filename: "031_ai_search_plugin.sql",
    sql: "-- AI Search removed from lightweight CMS core.\nSELECT 1;\n",
  },
  {
    id: "032",
    name: "User Profiles",
    filename: "032_user_profiles.sql",
    sql: "-- User Profiles Table (Core Migration)\n-- Stores extended user profile data separate from auth concerns\n-- Required by admin-users.ts for user edit page profile management\n--\n-- Originally introduced as app-level migration (worker-blog-cms/migrations/018_user_profiles.sql)\n-- in upstream PR #508. Core routes (admin-users.ts) were updated to query this table in PR #512,\n-- but no corresponding core migration was added. This migration corrects that gap.\n--\n-- IF NOT EXISTS guards ensure idempotency for databases that already have the table\n-- from the app-level migration.\n\nCREATE TABLE IF NOT EXISTS user_profiles (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,\n\n  display_name TEXT,\n  bio TEXT,\n  company TEXT,\n  job_title TEXT,\n  website TEXT,\n  location TEXT,\n  date_of_birth INTEGER,\n  data TEXT DEFAULT '{}',\n\n  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),\n  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)\n);\n\n-- Index for fast user lookups\nCREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);\n\n-- Trigger to auto-update updated_at timestamp\nCREATE TRIGGER IF NOT EXISTS user_profiles_updated_at\n  AFTER UPDATE ON user_profiles\nBEGIN\n  UPDATE user_profiles SET updated_at = strftime('%s', 'now') * 1000 WHERE id = NEW.id;\nEND;\n",
  },
  {
    id: "033",
    name: "Form Content Integration",
    filename: "033_form_content_integration.sql",
    sql: "-- Form/content integration removed with the forms system.\nSELECT 1;\n",
  },
  {
    id: "034",
    name: "Security Audit Plugin",
    filename: "034_security_audit_plugin.sql",
    sql: "-- Security Audit Plugin\n-- Tracks login attempts, registrations, and security events for monitoring and brute-force detection\n\nCREATE TABLE IF NOT EXISTS security_events (\n  id TEXT PRIMARY KEY,\n  event_type TEXT NOT NULL,\n  severity TEXT NOT NULL DEFAULT 'info',\n  user_id TEXT,\n  email TEXT,\n  ip_address TEXT,\n  user_agent TEXT,\n  country_code TEXT,\n  request_path TEXT,\n  request_method TEXT,\n  details TEXT,\n  fingerprint TEXT,\n  blocked INTEGER NOT NULL DEFAULT 0,\n  created_at INTEGER NOT NULL\n);\n\nCREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);\nCREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);\nCREATE INDEX IF NOT EXISTS idx_security_events_email ON security_events(email);\nCREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);\nCREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);\nCREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);\nCREATE INDEX IF NOT EXISTS idx_security_events_fingerprint ON security_events(fingerprint);\n",
  },
  {
    id: "035",
    name: "User Profiles Data Column",
    filename: "035_user_profiles_data_column.sql",
    sql: "-- Migration 035: Add data column to user_profiles (no-op)\n--\n-- This migration originally added a missing 'data' column to user_profiles.\n-- Migration 032 has since been updated to include the column in the CREATE TABLE,\n-- so on fresh installs the column already exists by the time this runs.\n--\n-- The ALTER TABLE has been removed to prevent \"duplicate column name: data\" errors\n-- during fresh installs (GitHub issue #771). Wrangler's migration runner does not\n-- gracefully handle duplicate column errors like the runtime MigrationService does.\n--\n-- Existing databases that ran the old 032 (without the data column) get the column\n-- added at runtime by the core MigrationService, which skips duplicate-column errors.\n--\n-- This file is kept as a no-op so that wrangler's migration tracking remains\n-- consistent (it tracks migrations by filename).\nSELECT 1;\n",
  },
  {
    id: "036",
    name: "Analytics Events",
    filename: "036_analytics_events.sql",
    sql: "-- Migration 036: Analytics Events Table\n-- Provides storage for user behavior event tracking (page views, custom events)\n\nCREATE TABLE IF NOT EXISTS analytics_events (\n    id TEXT PRIMARY KEY,\n    event TEXT NOT NULL,\n    category TEXT NOT NULL DEFAULT 'user-activity',\n    properties TEXT,\n    user_id TEXT,\n    session_id TEXT,\n    ip_address TEXT,\n    user_agent TEXT,\n    path TEXT,\n    created_at INTEGER NOT NULL DEFAULT (unixepoch())\n);\n\nCREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event);\nCREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(category);\nCREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);\nCREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);\nCREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);\nCREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events(path);\n",
  },
  {
    id: "037",
    name: "Drop Plugin Platform Tables",
    filename: "037_drop_plugin_platform_tables.sql",
    sql: "-- Plugin platform removed from lightweight CMS core.\nDROP TABLE IF EXISTS plugin_activity_log;\nDROP TABLE IF EXISTS plugin_assets;\nDROP TABLE IF EXISTS plugin_routes;\nDROP TABLE IF EXISTS plugin_hooks;\nDROP TABLE IF EXISTS plugins;\nDROP TABLE IF EXISTS plugin_settings;\n",
  },
  {
    id: "038",
    name: "Drop Removed Feature Tables",
    filename: "038_drop_removed_feature_tables.sql",
    sql: "-- Drop tables owned by removed built-in product features.\n\nDROP TABLE IF EXISTS form_files;\nDROP TABLE IF EXISTS form_submissions;\nDROP TABLE IF EXISTS forms;\n\nDROP TABLE IF EXISTS ai_search_index_meta;\nDROP TABLE IF EXISTS ai_search_history;\nDROP TABLE IF EXISTS ai_search_settings;\n\nDROP TABLE IF EXISTS workflow_transitions;\nDROP TABLE IF EXISTS content_workflow_status;\nDROP TABLE IF EXISTS workflow_states;\nDROP TABLE IF EXISTS workflow_history;\nDROP TABLE IF EXISTS workflows;\nDROP TABLE IF EXISTS scheduled_content;\nDROP TABLE IF EXISTS notifications;\nDROP TABLE IF EXISTS notification_preferences;\nDROP TABLE IF EXISTS webhook_deliveries;\nDROP TABLE IF EXISTS webhooks;\nDROP TABLE IF EXISTS automation_rules;\nDROP TABLE IF EXISTS auto_save_drafts;\nDROP TABLE IF EXISTS workflow_templates;\nDROP TABLE IF EXISTS content_relationships;\n\nDROP TABLE IF EXISTS oauth_accounts;\nDROP TABLE IF EXISTS magic_links;\nDROP TABLE IF EXISTS otp_codes;\nDROP TABLE IF EXISTS api_tokens;\nDROP TABLE IF EXISTS user_sessions;\nDROP TABLE IF EXISTS team_memberships;\nDROP TABLE IF EXISTS teams;\nDROP TABLE IF EXISTS role_permissions;\nDROP TABLE IF EXISTS permissions;\n\nDROP TABLE IF EXISTS stripe_events;\nDROP TABLE IF EXISTS subscriptions;\nDROP TABLE IF EXISTS email_variables;\nDROP TABLE IF EXISTS email_logs;\nDROP TABLE IF EXISTS email_templates;\nDROP TABLE IF EXISTS email_themes;\nDROP TABLE IF EXISTS global_variables;\nDROP TABLE IF EXISTS shortcodes;\nDROP TABLE IF EXISTS redirects;\nDROP TABLE IF EXISTS redirect_analytics;\n\nDROP TABLE IF EXISTS faqs;\nDROP TABLE IF EXISTS testimonials;\nDROP TABLE IF EXISTS code_examples;\nDROP TABLE IF EXISTS plugins;\nDROP TABLE IF EXISTS plugin_routes;\nDROP TABLE IF EXISTS plugin_hooks;\nDROP TABLE IF EXISTS plugin_assets;\nDROP TABLE IF EXISTS plugin_activity_log;\nDROP TABLE IF EXISTS plugin_settings;\n",
  },
]

export const bundledMigrationsById = new Map(
  bundledMigrations.map((migration) => [migration.id, migration]),
)

export function getMigrationSQLById(id: string): string | undefined {
  return bundledMigrationsById.get(id)?.sql
}
