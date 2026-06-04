# AGENTS.md

Guidance for Codex and other coding agents working in this repository.

## 项目情况

- 这是一个全新的项目，还没有上线，所以在做 plan，更改代码的时候不用考虑兼容性，直接使用最佳实践
- 修改数据后不要更改迁移文件

## Monorepo Shared Code

This repository is organized into packages under `packages/`.

When adding or changing code, if a piece of logic, type, schema, utility, validation rule, API contract, or UI-independent helper can be reused by more than one package, place it in `packages/shared` instead of duplicating it inside an individual package.

Keep package-specific code inside the package that owns it. Move code to `packages/shared` only when it is genuinely reusable across package boundaries or represents a shared contract between packages.

Examples of content that usually belongs in `packages/shared`:

- Shared TypeScript types and interfaces.
- API request and response contracts.
- Validation schemas used by both client and server.
- Pure utilities with no dependency on package-specific runtime APIs.
- Constants that must stay consistent across packages.

Examples of content that should usually stay package-local:

- Server-only code that depends on Cloudflare bindings, D1, Hono, or runtime middleware.
- Admin UI components and page-specific presentation logic.
- Editor-only behavior.
- Implementation details used by only one package.
