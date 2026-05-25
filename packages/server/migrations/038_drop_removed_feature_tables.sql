-- Drop tables owned by removed built-in product features.

DROP TABLE IF EXISTS form_files;
DROP TABLE IF EXISTS form_submissions;
DROP TABLE IF EXISTS forms;

DROP TABLE IF EXISTS ai_search_index_meta;
DROP TABLE IF EXISTS ai_search_history;
DROP TABLE IF EXISTS ai_search_settings;

DROP TABLE IF EXISTS workflow_transitions;
DROP TABLE IF EXISTS content_workflow_status;
DROP TABLE IF EXISTS workflow_states;
DROP TABLE IF EXISTS workflow_history;
DROP TABLE IF EXISTS workflows;
DROP TABLE IF EXISTS scheduled_content;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS webhook_deliveries;
DROP TABLE IF EXISTS webhooks;
DROP TABLE IF EXISTS automation_rules;
DROP TABLE IF EXISTS auto_save_drafts;
DROP TABLE IF EXISTS workflow_templates;
DROP TABLE IF EXISTS content_relationships;

DROP TABLE IF EXISTS oauth_accounts;
DROP TABLE IF EXISTS magic_links;
DROP TABLE IF EXISTS otp_codes;
DROP TABLE IF EXISTS api_tokens;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS team_memberships;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;

DROP TABLE IF EXISTS stripe_events;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS email_variables;
DROP TABLE IF EXISTS email_logs;
DROP TABLE IF EXISTS email_templates;
DROP TABLE IF EXISTS email_themes;
DROP TABLE IF EXISTS global_variables;
DROP TABLE IF EXISTS shortcodes;
DROP TABLE IF EXISTS redirects;
DROP TABLE IF EXISTS redirect_analytics;

DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS testimonials;
DROP TABLE IF EXISTS code_examples;
DROP TABLE IF EXISTS plugins;
DROP TABLE IF EXISTS plugin_routes;
DROP TABLE IF EXISTS plugin_hooks;
DROP TABLE IF EXISTS plugin_assets;
DROP TABLE IF EXISTS plugin_activity_log;
DROP TABLE IF EXISTS plugin_settings;
