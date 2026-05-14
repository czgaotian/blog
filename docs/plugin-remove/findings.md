# Findings

## Plugin Usage Inventory

- Plugin manifests live under `packages/server/src/plugins/**/manifest.json`; `packages/server/src/plugins/manifest-registry.ts` is generated from those manifests.
- Current manifest count: 27 plugins.
- Manifest IDs: ai-search, code-examples-plugin, core-analytics, core-auth, core-cache, core-media, database-tools, demo-login-plugin, design, easy-mdx, email, global-variables, hello-world, magic-link-auth, oauth-providers, otp-login, quill-editor, redirect-management, security-audit, seed-data, shortcodes, stripe, testimonials-plugin, tinymce-plugin, turnstile, user-profiles, workflow-plugin.
- Manifests marked `is_core`: ai-search, core-analytics, core-auth, core-cache, core-media, oauth-providers, quill-editor, stripe, turnstile, user-profiles.
- Bootstrapped on first non-static request: core-auth, core-media, database-tools, seed-data, core-cache, workflow-plugin, easy-mdx, ai-search, oauth-providers, global-variables, user-profiles, stripe.
- Database/plugin admin model is stored through `plugins`, `plugin_hooks`, `plugin_routes`, `plugin_assets`, and `plugin_activity_log` migrations. `PluginService` reads/writes status, settings, activation, dependencies, routes/hooks metadata, and activity.
- `PluginBuilder` supports routes, middleware, models, services, admin pages, admin components, menu items, hooks, and lifecycle hooks. Many server plugins use this builder.
- Actual runtime route mounting is manual in `packages/server/src/app.ts`. The helper `registerApiPluginRoutes` mounts only `/api/*` routes and maps `/auth/*` to `/api/auth/*`; it ignores `/admin/*` plugin routes.
- Directly mounted plugin-related routes include database tools, seed data, cache, selected API/auth plugin routes, and public event tracking. Server-side HTML plugin admin routes declared by plugins are not generally mounted by the helper.
- `pluginMenuMiddleware` builds sidebar items from active plugins with `adminMenu`, but it is mounted on `/api/admin/*` while the middleware only runs when the request path starts with `/admin`. That means `/api/admin/me` will normally receive an empty `pluginMenu`.
- `packages/admin` React SPA has generic plugin pages only: `/admin/plugins` and `/admin/plugins/:id/settings`.
- Admin SPA calls `/api/admin/plugins` for registry + DB status and `/api/admin/plugin-settings/:id/settings` for manifest schema/settings.
- Admin package also still contains legacy/template editor plugin adapters for TinyMCE, EasyMDE, and Quill used by `src/templates/pages/admin-content-form.template.ts`, not by the current React content edit page.

## Frontend Plugin Inventory

`packages/admin` does not contain a full frontend plugin runtime. It has plugin-related UI and a few legacy editor adapters:

| Area | Files | Purpose | Current role |
|------|-------|---------|--------------|
| Generic plugin list | `packages/admin/src/spa/pages/plugins-list.tsx`, `packages/admin/src/spa/api/plugins.ts` | Fetches `/api/admin/plugins` and renders installed/registry plugins with status counters. | Remove from frontend and remove the backend `/api/admin/plugins` endpoint. |
| Generic plugin settings | `packages/admin/src/spa/pages/plugin-settings.tsx`, `packages/admin/src/spa/api/plugin-settings.ts` | Fetches/saves `/api/admin/plugin-settings/:id/settings` based on manifest `settingsSchema`. | Remove from frontend and remove the backend plugin settings endpoint. |
| Admin navigation | `packages/admin/src/spa/layouts/admin-layout.tsx`, `packages/admin/src/spa/router.tsx` | Adds `/admin/plugins` and `/admin/plugins/:id/settings`; optionally renders `pluginMenu` from `/api/admin/me`. | Remove Plugins nav/routes and remove dynamic plugin menu rendering. |
| EasyMDE adapter | `packages/admin/src/plugins/easy-mdx.ts`, `packages/admin/src/plugins/available/easy-mdx/index.ts` | Emits EasyMDE CDN CSS/JS and an init stub. | Keep for now with TODO; handle later with the content editor direction. |
| TinyMCE adapter | `packages/admin/src/plugins/tinymce-plugin.ts`, `packages/admin/src/plugins/available/tinymce-plugin/index.ts` | Emits TinyMCE CDN script and initializes textareas with `data-editor-provider="tinymce"`. | Keep for now with TODO; handle later with the content editor direction. |
| Quill adapter | `packages/admin/src/plugins/core-plugins/quill-editor/index.ts` | Emits Quill CDN CSS/JS and an init stub. | Keep for now with TODO; handle later with the content editor direction. |
| Legacy template plugin pages | `packages/admin/src/templates/pages/admin-plugins-list.template.ts`, `packages/admin/src/templates/pages/admin-plugin-settings.template.ts` | Older server-rendered plugin list/settings screens with install/uninstall/activate/deactivate assumptions and custom settings renderers. | Remove or mark TODO legacy if references need a staged cleanup. |

Conclusion: frontend "plugins" are not independently loaded modules. Remove the generic plugin-management screens now; keep editor helper scripts temporarily with TODOs for a later content editor cleanup.

## Backend Plugin Manifest Inventory

Back-end plugin manifests currently found under `packages/server/src/plugins/**/manifest.json`:

| ID | Display name | Category | Core? | Purpose |
|----|--------------|----------|-------|---------|
| `easy-mdx` | EasyMDE Markdown Editor | editor | no | Markdown editor integration with live preview for rich text fields. |
| `magic-link-auth` | Magic Link Authentication | security | no | Passwordless login through emailed one-time magic links. |
| `tinymce-plugin` | TinyMCE Rich Text Editor | editor | no | TinyMCE WYSIWYG editor integration for rich text fields. |
| `core-cache` | Cache System | system | yes | Three-tier cache using memory/KV with TTLs and invalidation. |
| `ai-search` | AI Search | content | yes | Full-text/semantic content search using Cloudflare AI Search/RAG-related services. |
| `core-analytics` | Analytics & Insights | seo | yes | Page view, event, behavior, and content performance tracking. |
| `core-auth` | Authentication System | security | yes | Authentication, users, roles, sessions, and RBAC-related settings. |
| `code-examples-plugin` | Code Examples | content | no | Code snippet/content library with syntax highlighting metadata. |
| `database-tools` | Database Tools | development | no | Admin database utilities such as migrations, backup, validation, query execution. |
| `demo-login-plugin` | Demo Login | utilities | no | Demo credential prefill/login helper for testing and demos. |
| `email` | Email | utilities | no | Transactional email sending through Resend. |
| `global-variables` | Global Variables | content | no | Key-value content variables resolved inside rich text/content. |
| `hello-world` | Hello World | utilities | no | Minimal demonstration plugin. |
| `core-media` | Media Manager | media | yes | Media upload/management with optimization, thumbnails, and storage integration. |
| `oauth-providers` | OAuth Providers | authentication | yes | OAuth2/OIDC social login providers such as GitHub and Google. |
| `otp-login` | OTP Login | security | no | Passwordless login with emailed one-time codes. |
| `quill-editor` | Quill Rich Text Editor | editor | yes | Quill WYSIWYG editor integration for rich text fields. |
| `security-audit` | Security Audit | security | no | Security event logging, brute-force detection, and security dashboards. |
| `seed-data` | Seed Data Generator | development | no | Development/demo sample data generator. |
| `shortcodes` | Shortcodes | content | no | Server-side shortcode resolution and admin CRUD for dynamic content snippets. |
| `stripe` | Stripe Subscriptions | payments | yes | Stripe checkout, subscriptions, webhooks, and subscription gating. |
| `testimonials-plugin` | Testimonials | content | no | Customer testimonial/review content with ratings and display widgets. |
| `turnstile` | Cloudflare Turnstile | security | yes | CAPTCHA-free bot protection and reusable verification helpers. |
| `user-profiles` | User Profiles | users | yes | Configurable custom user profile fields. |
| `workflow-plugin` | Workflow Engine | content | no | Content workflow states, transitions, approvals, scheduling, and automation. |
| `design` | Design System | utilities | no | Design token/theme/component customization surface. |
| `redirect-management` | Redirect Management | utilities | no | URL redirect rules using exact, partial, and regex matching. |

Important nuance: these manifests overstate runtime dynamism. Many of the corresponding routes/services are imported manually from `packages/server/src/app.ts`, and `/admin/plugins/...` HTML routes declared by plugins are not broadly mounted by the current helper.

Migration decision: keep backend functionality, but migrate it out of plugin-platform semantics into built-in modules. The target shape is explicit `features/*` modules with direct Hono route registration and explicit services. Do not keep a backend plugin configuration API, do not add `FeatureSettingsService`, and do not use `plugins.status`/`plugins.settings` as feature switches.

## Plugin Database Tables

Plugin-related tables are created by `packages/server/migrations/006_plugin_system.sql` and mirrored in `packages/server/src/db/schema.ts`:

| Table | Purpose | Current migration recommendation |
|-------|---------|----------------------------------|
| `plugins` | Main registry/status/settings table. Stores id, name, display metadata, version, status, `is_core`, `settings`, permissions, dependencies, install/update timestamps, and error state. | Do not keep as a configuration source; remove after runtime references are cleared. |
| `plugin_hooks` | Intended DB registry for plugin hook handlers by hook name, priority, and active flag. | Candidate for removal once hook-system/platform layer is retired; verify no live data dependency first. |
| `plugin_routes` | Intended DB registry for plugin routes by path/method/handler. | Candidate for removal; actual route mounting is code-based/manual today. |
| `plugin_assets` | Intended DB registry for plugin CSS/JS/image/font assets and load order. | Candidate for removal if no asset loader consumes it. |
| `plugin_activity_log` | Audit trail for plugin install/activate/deactivate/settings/error activity via `PluginService`. | Remove with the plugin management layer. |

No `plugin_settings` table is defined in the migrations/schema inspected here. One database tools service excludes a `plugin_settings` table name, but the actual persisted settings are in `plugins.settings`; under the current decision, that settings model should not be carried forward.
