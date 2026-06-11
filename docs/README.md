# Worker Blog Documentation Index

本目录是 Worker Blog 项目的 AI-readable 文档入口。文档按主题拆分，尽量使用稳定标题、短段落、代码路径和明确的边界说明，方便 AI agent 和开发者快速检索。

## 快速阅读顺序

1. [ai-context.md](./ai-context.md): 面向 AI agent 的高密度项目上下文。
2. [project-design.md](./project-design.md): 产品目标、功能模块、核心设计原则。
3. [usage.md](./usage.md): 本地运行、数据库迁移、测试、构建、Bruno API 使用。
4. [architecture.md](./architecture.md): monorepo、运行时、包边界、请求流。
5. [backend.md](./backend.md): Hono Worker、路由、中间件、服务层、Cloudflare bindings。
6. [frontend.md](./frontend.md): Admin UI、Editor、API client、路由和 UI 约定。
7. [data-model.md](./data-model.md): D1 表结构、核心实体关系、内容 bodyJson/bodyHtml 设计。
8. [api.md](./api.md): Public API、Admin API、认证、媒体、观测相关端点。
9. [development-guide.md](./development-guide.md): 修改代码时的约定、验证命令、常见风险。

## 项目一句话

Worker Blog 是一个运行在 Cloudflare Workers 上的 headless CMS / blog admin monorepo。后端使用 Hono + D1 + R2 + KV，前端 Admin 使用 React + Vite，编辑器使用 Tiptap，共享契约放在 `packages/shared`。

## 重要代码入口

| Area | Path |
| --- | --- |
| Worker entry | `packages/server/src/index.ts` |
| App factory | `packages/server/src/app.ts` |
| Route registration | `packages/server/src/app-registration.ts` |
| Cloudflare config | `packages/server/wrangler.toml` |
| Admin app entry | `packages/admin/src/main.tsx` |
| Admin routes | `packages/admin/src/router.tsx` |
| Admin API client | `packages/admin/src/api/client.ts` |
| Editor export | `packages/editor/src/index.ts` |
| Shared contracts | `packages/shared/src/admin-api/` |
| Database schema | `packages/server/src/db/schema.ts` |
| Bruno API collection | `bruno/` |

## Agent Rules

- 本项目还未上线；实现新功能时可以优先选择最佳实践，不需要保持历史兼容。
- 修改数据模型后不要改写已有 migration 文件。
- 可跨包复用的类型、schema、API contract、纯工具函数放入 `packages/shared`。
- Server-only Cloudflare/Hono/D1 逻辑留在 `packages/server`。
- Admin UI 页面和组件留在 `packages/admin`。
- Editor-only 行为留在 `packages/editor`。
