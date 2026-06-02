-- Initial lightweight CMS schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  avatar TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  email_notifications INTEGER DEFAULT 1,
  theme TEXT DEFAULT 'dark',
  two_factor_enabled INTEGER DEFAULT 0,
  two_factor_secret TEXT,
  password_reset_token TEXT,
  password_reset_expires INTEGER,
  email_verified INTEGER DEFAULT 0,
  email_verification_token TEXT,
  invitation_token TEXT,
  invited_by TEXT REFERENCES users(id),
  invited_at INTEGER,
  accepted_invitation_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  schema TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at INTEGER,
  author_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS content_versions (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES content(id),
  version INTEGER NOT NULL,
  data TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  folder TEXT NOT NULL DEFAULT 'uploads',
  r2_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt TEXT,
  caption TEXT,
  tags TEXT,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  uploaded_at INTEGER NOT NULL,
  updated_at INTEGER,
  published_at INTEGER,
  scheduled_at INTEGER,
  archived_at INTEGER,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(category, key)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS password_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  company TEXT,
  job_title TEXT,
  website TEXT,
  location TEXT,
  date_of_birth INTEGER,
  data TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  category TEXT NOT NULL CHECK (category IN ('auth', 'api', 'media', 'system', 'security', 'error')),
  message TEXT NOT NULL,
  data TEXT,
  user_id TEXT REFERENCES users(id),
  session_id TEXT,
  request_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  method TEXT,
  url TEXT,
  status_code INTEGER,
  duration INTEGER,
  stack_trace TEXT,
  tags TEXT,
  source TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS log_config (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL UNIQUE CHECK (category IN ('auth', 'api', 'media', 'system', 'security', 'error')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  retention INTEGER NOT NULL DEFAULT 30,
  max_size INTEGER DEFAULT 10000,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  user_id TEXT,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  country_code TEXT,
  request_path TEXT,
  request_method TEXT,
  details TEXT,
  fingerprint TEXT,
  blocked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'user-activity',
  properties TEXT,
  user_id TEXT,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  path TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token);

CREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name);
CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_active);

CREATE INDEX IF NOT EXISTS idx_content_collection ON content(collection_id);
CREATE INDEX IF NOT EXISTS idx_content_author ON content(author_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_published ON content(published_at);
CREATE INDEX IF NOT EXISTS idx_content_slug ON content(slug);
CREATE INDEX IF NOT EXISTS idx_content_deleted ON content(deleted_at);

CREATE INDEX IF NOT EXISTS idx_content_versions_content ON content_versions(content_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_version ON content_versions(version);

CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(mime_type);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON media(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_media_deleted ON media(deleted_at);

CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_category_key ON settings(category, key);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_status_code ON system_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_email ON security_events(email);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_fingerprint ON security_events(fingerprint);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events(path);

CREATE TRIGGER IF NOT EXISTS user_profiles_updated_at
  AFTER UPDATE ON user_profiles
BEGIN
  UPDATE user_profiles SET updated_at = strftime('%s', 'now') * 1000 WHERE id = NEW.id;
END;

INSERT OR IGNORE INTO settings (id, category, key, value, created_at, updated_at)
VALUES
  ('setting-general-site-name', 'general', 'siteName', '"Worker Blog"', unixepoch() * 1000, unixepoch() * 1000),
  ('setting-general-site-description', 'general', 'siteDescription', '"A lightweight CMS for Cloudflare"', unixepoch() * 1000, unixepoch() * 1000),
  ('setting-general-timezone', 'general', 'timezone', '"UTC"', unixepoch() * 1000, unixepoch() * 1000),
  ('setting-general-language', 'general', 'language', '"en"', unixepoch() * 1000, unixepoch() * 1000),
  ('setting-general-maintenance-mode', 'general', 'maintenanceMode', 'false', unixepoch() * 1000, unixepoch() * 1000),
  ('setting-security-jwt-expires-in', 'security', 'jwtExpiresIn', '"30d"', unixepoch() * 1000, unixepoch() * 1000),
  ('setting-security-refresh-grace', 'security', 'jwtRefreshGraceSeconds', '604800', unixepoch() * 1000, unixepoch() * 1000);

INSERT OR IGNORE INTO log_config (id, category, enabled, level, retention, max_size)
VALUES
  ('log-config-auth', 'auth', TRUE, 'info', 90, 10000),
  ('log-config-api', 'api', TRUE, 'info', 30, 10000),
  ('log-config-media', 'media', TRUE, 'info', 30, 10000),
  ('log-config-system', 'system', TRUE, 'info', 90, 10000),
  ('log-config-security', 'security', TRUE, 'warn', 180, 10000),
  ('log-config-error', 'error', TRUE, 'error', 90, 10000);
