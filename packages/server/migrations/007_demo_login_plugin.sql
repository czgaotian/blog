-- Demo Login Plugin Migration
-- Migration: 007_demo_login_plugin
-- Description: Add demo login prefill plugin to the plugin registry

-- Insert demo login plugin
INSERT INTO plugins (
    id, name, display_name, description, version, author, category, icon, 
    status, is_core, permissions, installed_at, last_updated
) VALUES (
    'demo-login-prefill',
    'demo-login-plugin',
    'Demo Login Prefill',
    'Prefills login form with demo credentials (admin@worker-blog.com/worker-blog!) for easy site demonstration',
    '1.0.0',
    'Worker Blog',
    'demo',
    '🎯',
    'inactive',
    TRUE,
    '[]',
    unixepoch(),
    unixepoch()
);