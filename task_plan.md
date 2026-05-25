# Lightweight CMS Server Cleanup Plan

## Goal

Turn `packages/server` into a lightweight CMS backend by keeping only core CMS, password authentication, media, settings, logging, security audit, and analytics. Remove built-in product features and legacy plugin-era tables/routes/code.

## Keep

- Core CMS: users, user profiles if still needed by admin profile UI, collections, content, content fields, content versions, media, settings.
- Auth: password login only.
- Logs/audit/analytics: activity logs, system logs/log config, security events, analytics events.
- Runtime support: migrations table, bootstrap, request context, security headers, rate limiting, CSRF.

## Remove

- Forms system.
- Workflow and automation.
- AI Search.
- Stripe/payment.
- Email/email templates.
- Redirect management.
- Content extensions: global variables, shortcodes.
- OAuth, magic link, OTP auth.
- Legacy plugin/demo/example tables and code.
- Half-built team/permission/session tables and code.

## Phases

1. Inventory database tables, routes, feature imports, and migration coupling. Status: complete.
2. Define target schema and migration strategy for fresh installs and existing DB cleanup. Status: complete.
3. Remove feature route registration and feature modules for deleted capabilities. Status: complete.
4. Remove schema exports, migrations, services, tests, admin/shared API references, and env bindings for deleted capabilities. Status: complete.
5. Reorganize server routes/directories around core modules. Status: partial.
6. Run type-check and focused tests; fix fallout. Status: complete.

## Decisions

- The server should no longer be a feature/plugin host.
- Integrations are not built in by default; deleted capabilities can return later as external packages.
- Password auth is the only supported auth mode in the slim core.
- Forms are removed completely, including form/content integration.

## Errors Encountered

None yet.
