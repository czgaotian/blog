-- Migration 037: Drop Plugin Platform Tables
-- Removes legacy plugin platform tables after features were converted to built-in modules.

DROP TABLE IF EXISTS plugin_activity_log;
DROP TABLE IF EXISTS plugin_assets;
DROP TABLE IF EXISTS plugin_routes;
DROP TABLE IF EXISTS plugin_hooks;
DROP TABLE IF EXISTS plugins;

DELETE FROM role_permissions WHERE permission_id = 'manage:plugins';
DELETE FROM permissions WHERE id = 'manage:plugins';
