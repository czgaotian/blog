# Server Plugin Directory Removal Findings

## Initial Repository Findings

- `packages/server/src/plugins` exists and contains active business logic, not only plugin metadata.
- Active runtime imports from `packages/server/src/app.ts` include database tools, seed data, email, OTP login, OAuth providers, user profiles, AI search, magic link auth, security audit, Stripe, analytics, workflow, and cache.
- `packages/server/src/routes/public-forms.ts` imports Turnstile service from `../plugins/core-plugins/turnstile-plugin/services/turnstile`.
- `packages/server/src/routes/auth.ts` imports user profile helpers from `../plugins/core-plugins/user-profiles`.
- `packages/server/src/routes/api-content-crud.ts` imports global variable resolution from `../plugins/core-plugins/global-variables-plugin/variable-resolver`.
- `packages/server/src/config/app.ts` still imports `pluginConfig` from `./plugins`.
- `packages/server/src/config/plugins.ts` still defines `directory: './src/plugins'` even though `autoLoad` is false.
- `WorkerBlogConfig` in `packages/server/src/app.ts` still exposes a `plugins` config block.

## Existing Plans and Context

- `docs/plugin-remove/plugin-system-deprecation-plan.md` already records the previous decision to retire the dynamic plugin platform and keep features as built-in modules.
- That prior plan says platform abstractions and plugin DB schema have already been removed or neutralized, but feature code remains in `packages/server/src/plugins/*`.
- `docs/core-plugins-from-server-side-to-spa/core-plugins-from-server-side-to-spa.md` documents a related migration from plugin server-rendered pages to SPA/API surfaces.

## Current Admin/API Coupling

- Admin UI still has explicit plugin-oriented paths for feature pages:
  - `/admin/plugins/ai-search`
  - `/admin/plugins/stripe`
  - `/admin/plugins/security-audit`
  - `/admin/plugins/analytics`
  - `/admin/plugins/workflow`
- Admin API clients still use `/api/plugins/*` for AI Search, Stripe, Security Audit, Analytics, and Workflow.
- Shared route metadata still contains `/admin/plugins/ai-search/*` and `/admin/plugins/email/*` entries.

## Directory Inventory Summary

Observed active or potentially active areas under `packages/server/src/plugins`:

- `core-plugins/ai-search-plugin`
- `core-plugins/analytics`
- `core-plugins/database-tools-plugin`
- `core-plugins/email-plugin`
- `core-plugins/global-variables-plugin`
- `core-plugins/oauth-providers`
- `core-plugins/otp-login-plugin`
- `core-plugins/security-audit-plugin`
- `core-plugins/seed-data-plugin`
- `core-plugins/stripe-plugin`
- `core-plugins/turnstile-plugin`
- `core-plugins/user-profiles`
- `core-plugins/workflow-plugin`
- `cache`
- `available/magic-link-auth`
- `redirect-management`
- `design`

Observed likely manifest/example/legacy areas requiring confirmation:

- `core-plugins/auth`
- `core-plugins/media`
- `core-plugins/quill-editor`
- `core-plugins/easy-mdx` via `available/easy-mdx`
- `core-plugins/tinymce-plugin` via `available/tinymce-plugin`
- `core-plugins/code-examples`
- `core-plugins/testimonials`
- `core-plugins/demo-login`
- `core-plugins/hello-world-plugin`
- `available/email-templates-plugin`

## Initial Migration Targets

Suggested target layout:

```text
packages/server/src/features/ai-search
packages/server/src/features/analytics
packages/server/src/features/auth/magic-link
packages/server/src/features/auth/oauth-providers
packages/server/src/features/auth/otp-login
packages/server/src/features/cache
packages/server/src/features/database-tools
packages/server/src/features/email
packages/server/src/features/global-variables
packages/server/src/features/redirect-management
packages/server/src/features/security-audit
packages/server/src/features/seed-data
packages/server/src/features/stripe
packages/server/src/features/turnstile
packages/server/src/features/user-profiles
packages/server/src/features/workflow
```

## Verification Commands To Use During Implementation

```bash
rg "src/plugins|../plugins|./plugins|plugins/" packages/server packages/admin packages/shared
pnpm type-check
pnpm --filter @worker-blog/server test
pnpm --filter @worker-blog/admin build
```

