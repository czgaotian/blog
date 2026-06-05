# Lightweight CMS Server Cleanup Findings

## Initial User Decisions

- Keep a lighter CMS core.
- Keep core CMS tables and behavior.
- Keep password login only.
- Remove forms completely.
- Keep logging, security audit, and analytics.
- Delete AI Search entirely.
- Delete Workflow entirely.
- Delete payment, email, content-extension, legacy plugin, and half-built discussion tables/code.

## Existing Dirty Worktree

- `packages/server/src/app.ts` has local changes moving app types to `packages/server/src/types/app.ts`.
- `packages/server/src/types/index.ts` exports the new app types.
- `packages/server/src/types/app.ts` is untracked and contains extracted `Bindings`, `Variables`, `WorkerBlogConfig`, and `WorkerBlogApp`.
- These changes align with server reorganization and should be preserved.

## Database Table Buckets

### Keep

- `users`
- `user_profiles` pending final check, currently used by profile/admin user surfaces.
- `collections`
- `content`
- `content_fields`
- `content_versions`
- `media`
- `settings`
- `activity_logs`
- `system_logs`
- `log_config`
- `security_events`
- `analytics_events`
- `migrations`

### Remove

- Forms: `forms`, `form_submissions`, `form_files`.
- Workflow: `workflow_states`, `workflows`, `workflow_transitions`, `content_workflow_status`, `workflow_history`, `scheduled_content`, `notifications`, `notification_preferences`, `webhooks`, `webhook_deliveries`, `automation_rules`, `auto_save_drafts`.
- AI Search: `ai_search_settings`, `ai_search_history`, `ai_search_index_meta`.
- Payments: `stripe_events`, `subscriptions`.
- Email templates: `email_themes`, `email_templates`, `email_logs`, `email_variables`.
- Content extensions: `global_variables`, `shortcodes`.
- Auth alternatives: `oauth_accounts`, `magic_links`, `otp_codes`.
- Legacy plugin/examples: `faqs`, `testimonials`, `code_examples`, `plugins`, `plugin_routes`, `plugin_hooks`, `plugin_assets`, `plugin_activity_log`.
- Half-built user management: `teams`, `team_memberships`, `permissions`, `role_permissions`, `user_sessions`.
- Stage 5 leftovers: `content_relationships`, `workflow_templates`.

## Route/Feature Areas To Remove

- `packages/server/src/features/ai-search`
- `packages/server/src/features/auth/magic-link`
- `packages/server/src/features/auth/oauth-providers`
- `packages/server/src/features/auth/otp-login`
- `packages/server/src/features/email`
- `packages/server/src/features/email-templates`
- `packages/server/src/features/global-variables`
- `packages/server/src/features/redirect-management`
- `packages/server/src/features/shortcodes`
- `packages/server/src/features/stripe`
- `packages/server/src/features/turnstile`
- `packages/server/src/features/workflow`
- Forms routes/services under `packages/server/src/routes` and `packages/server/src/services/form-collection-sync.ts`.

## Open Checks

- Confirm whether `workflow_history` is safe to remove despite initial core schema defining it.
- Confirm if `content_versions` should stay as a simple version table after workflow removal.
- Check admin package for pages/API clients that must be removed or hidden after server route removal.
