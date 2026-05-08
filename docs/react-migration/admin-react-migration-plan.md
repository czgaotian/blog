# Admin SPA Migration Plan

本文规划如何把 `@worker-blog/admin` 从当前的 `hono/html` 字符串模板，直接迁移到 React SPA，并让它可以随 `@worker-blog/server` 一起部署到 Cloudflare Worker。

这次目标不再是 React SSR 或局部 hydrate，而是把 admin 变成独立的浏览器应用：

```txt
browser /admin/*
  -> server 返回 SPA shell / 静态资源
  -> React Router 接管后台页面路由
  -> React Query / fetch 调用 /admin/api/* 和现有业务 API
  -> server 继续负责鉴权、权限、数据库、插件、Worker bindings
```

## 当前状态

admin 当前是 server 使用的 UI 渲染包：

```txt
server route
  -> 查询数据库、检查权限、读取插件状态
  -> 整理 PageData
  -> 调用 @worker-blog/admin/templates/... 的 render 函数
  -> c.html(renderedHtml)
```

现有特点：

- `packages/admin` 主要导出 `templates`，页面和组件都用字符串模板输出 HTML。
- `packages/server/src/routes/admin-*` 大量路由直接渲染 admin template。
- `packages/server/src/routes/admin-api.ts` 已经有一部分 JSON API，例如 stats、storage、activity、collections。
- 登录、注册和部分 auth flow 仍由 `packages/server/src/routes/auth.ts` 渲染页面。
- CSRF 已由 server middleware 使用 signed double-submit cookie 实现，旧 layout 里有给 HTMX/fetch/form 自动附加 token 的脚本。
- Worker binding 类型里已经有 `ASSETS: Fetcher`，但 `wrangler.toml` 目前还没有配置 SPA assets 目录。
- `wrangler.toml` 里 R2 binding 写的是 `BUCKET`，代码使用的是 `MEDIA_BUCKET`，Worker 部署前需要统一。

## 目标架构

迁移后的包边界：

```txt
admin
  -> React SPA、路由、页面、组件、客户端状态、asset build
  -> 只依赖 shared 和浏览器可用工具

server
  -> Hono routes、auth、RBAC、CSRF、数据库、R2/KV/D1、插件服务
  -> 提供 JSON API 和 SPA shell/assets fallback

shared
  -> API contract、Zod schema、route metadata、纯类型、纯工具函数
```

关键原则：

- `admin` 不 import `server/src/db/schema`、`server/src/services`、Hono context 或 Worker bindings。
- `server` 不再把 admin 页面数据整理成 HTML，只把资源状态、权限状态和业务数据通过 JSON 返回。
- `shared` 放跨包契约，尤其是 API request/response 类型和 Zod schema。
- `/admin/api/*` 是 SPA 的后台数据边界。
- `/api/*` 可以继续作为公开或通用业务 API，但后台专用能力优先放在 `/admin/api/*`。
- `/auth/*` 第一阶段可以保留 server-rendered 页面，后续再决定是否把登录注册纳入 SPA。

## Admin 需要更新的地方

### 包和构建

把 `packages/admin` 从 template-only 包扩展为 SPA 包：

```txt
packages/admin/
  index.html
  components.json
  postcss.config.js
  tailwind.config.ts
  vite.config.ts
  src/
    spa/
      main.tsx
      app.tsx
      router.tsx
      api/
        client.ts
        query.ts
      pages/
      components/
        ui/
      layouts/
      features/
      styles/
        globals.css
    templates/
      ...
```

需要更新：

- 增加 `react`、`react-dom`、`@vitejs/plugin-react`、`vite`。
- 视复杂度增加 `react-router`、`@tanstack/react-query`、`zod`。
- 增加 Tailwind CSS 工具链：`tailwindcss`、`postcss`、`autoprefixer`。
- 使用 shadcn/ui 组件源码模式，增加 `components.json`，把组件生成到 `src/spa/components/ui/`。
- 增加 shadcn/ui 常用依赖，例如 `class-variance-authority`、`clsx`、`tailwind-merge`、`lucide-react` 和需要的 Radix primitives。
- `tsconfig.json` 开启 `jsx: "react-jsx"`。
- `package.json` 增加：
  - `dev`: 启动 Vite。
  - `build`: 输出 `dist/`。
  - `preview`: 本地预览 admin bundle。
  - `type-check`: admin 自身类型检查。
- `vite.config.ts` 设置 `base: "/admin/"`，让生产 HTML 引用 `/admin/assets/...`。
- `exports` 保留旧 `templates`，迁移期 server 仍可 import 旧模板。
- 新增 `dist/manifest.json` 或 Vite manifest，供 Worker shell 注入 hashed assets。

### 样式和组件栈

React SPA 的样式和基础组件统一使用 Tailwind CSS + shadcn/ui。

约定：

- Tailwind 是唯一的 SPA 样式管线，入口放在 `src/spa/styles/globals.css`。
- shadcn/ui 组件生成到 `src/spa/components/ui/`，作为本仓库源码维护，可以按 admin 需求微调。
- 业务组件放在 `src/spa/components/` 或 feature 内部，不直接混在 `ui/` 目录。
- 通用样式组合使用 `cn()` helper，内部基于 `clsx` 和 `tailwind-merge`。
- 图标优先使用 `lucide-react`。
- 主题 token 使用 CSS variables，对齐 shadcn/ui 的 `background`、`foreground`、`card`、`border`、`muted`、`primary` 等命名。
- 暗色模式使用 `class` strategy，由 admin layout 在根节点切换 `dark` class。
- 迁移旧页面时不要逐字复制旧 CSS class；应映射到 shadcn/ui 组件和 Tailwind token。

建议先引入的 shadcn/ui 组件：

- `button`
- `input`
- `textarea`
- `select`
- `checkbox`
- `switch`
- `label`
- `form`
- `table`
- `dialog`
- `dropdown-menu`
- `tabs`
- `badge`
- `alert`
- `card`
- `separator`
- `tooltip`
- `pagination` 或自定义分页组件

### SPA 入口

最小入口：

```txt
src/spa/main.tsx
src/spa/app.tsx
src/spa/router.tsx
src/spa/api/client.ts
```

入口职责：

- 挂载 React app 到 `#admin-root`。
- 初始化 React Query client。
- 读取当前用户、权限、CSRF 状态。
- 使用 browser router 管理 `/admin/*`。
- 对 401/403 统一跳转或显示权限错误。
- 对 mutating request 自动带 `X-CSRF-Token`。

### 页面和功能组织

建议按功能拆分，而不是按旧 template 文件一比一复制：

```txt
src/spa/features/
  dashboard/
  content/
  collections/
  media/
  forms/
  plugins/
  settings/
  users/
  logs/
  api-reference/
```

每个 feature 内部包含：

- `routes.tsx`
- `api.ts`
- `types.ts`
- `components/`
- `pages/`

### 客户端 API 层

统一封装 `fetch`：

- 默认 `credentials: "same-origin"`，沿用 cookie auth。
- 从 `csrf_token` cookie 读取 token，mutating request 附加 `X-CSRF-Token`。
- JSON 错误统一转成 typed error。
- 支持 `FormData` 上传，不强行设置 `Content-Type`。
- 支持 redirect 响应或 `{ redirectTo }` 约定。

### 设计和交互

SPA 迁移不是视觉重做，第一轮应保持现有 admin 信息架构，但具体实现以 shadcn/ui + Tailwind CSS 为准：

- 保留现有 sidebar/topbar、暗色模式、插件菜单、全局导航结构。
- 表格、分页、筛选、空状态、confirm dialog 先基于 shadcn/ui 抽成 React 基础组件。
- 表单统一使用 shadcn/ui form field 模式和 shared Zod schema。
- 颜色、间距、圆角、边框、focus ring 都通过 Tailwind token 管理，避免页面内散落一次性 CSS。
- 富文本编辑器、media picker、forms builder 后迁移，先保行为。
- 避免把旧 HTMX 交互原样塞进 React；每迁移一个页面，就把该页面交互改成 React state + API。

## Server 需要更新的地方

### SPA shell 和 assets

server 需要新增 admin SPA 服务层：

```txt
packages/server/src/routes/admin-spa.ts
packages/server/src/assets/admin-spa.ts
```

职责：

- `GET /admin` 和 `GET /admin/*` 对浏览器 navigation 返回 `index.html` shell。
- `/admin/assets/*` 返回 Vite build 产物，并设置长期缓存。
- 对 `/admin/api/*`、`/admin/*` 的非 navigation API 路由保持原有路由优先级。
- shell 中注入：
  - `<div id="admin-root"></div>`
  - hashed JS/CSS assets
  - 基础 meta
  - 可选 bootstrap JSON，例如 app name/version，但不注入敏感信息。

路由顺序很重要：

```txt
/admin/api/*        -> JSON API
/admin/assets/*     -> static assets
/admin legacy routes -> 迁移期旧 HTML 页面
/admin/*            -> SPA fallback shell
```

### JSON API 化

现有页面路由要逐步拆成 API：

```txt
旧：
GET /admin/content
  -> query DB
  -> renderContentListPage(pageData)

新：
GET /admin/api/content
  -> query DB
  -> return c.json(pageData)

GET /admin/content
  -> return SPA shell
```

API 设计规则：

- `GET` 返回页面所需数据或资源列表。
- `POST/PUT/PATCH/DELETE` 返回 JSON，不返回 HTML fragment。
- 表单校验错误统一返回 `422 { error, issues }`。
- 权限错误统一返回 `403 { error }`。
- 未登录统一返回 `401 { error, loginUrl }` 或直接让客户端跳转 `/auth/login`。
- 成功后的页面跳转用 `{ redirectTo }`，不要依赖 server redirect 被 fetch 自动吞掉。
- request/response schema 放到 `shared`，server 和 admin 共用。

### Admin route 拆分优先级

优先 API 化低风险页面：

1. dashboard
2. logs list / log details / log config
3. api reference
4. plugins list / plugin settings
5. settings
6. users
7. collections list / form
8. content list / form
9. media library
10. forms builder

复杂页面后置原因：

- content form 牵涉 dynamic fields、编辑器插件、preview、version history。
- media library 牵涉 R2 上传、文件选择、批量操作。
- forms builder 牵涉动态 schema、public forms、submission 管理。
- 插件页面可能还有 server 内部模板和独立 admin routes。

### Auth 和 CSRF

短期建议：

- `/auth/login`、`/auth/register`、magic link、OTP、OAuth callback 继续由 server route 处理。
- 登录成功后 redirect 到 `/admin/dashboard`，由 SPA 接管。
- 新增 `GET /admin/api/me` 返回当前用户、role、permissions、app version、plugin menu。
- 保留 signed double-submit CSRF cookie。
- SPA fetch client 复刻旧 layout 的 CSRF 行为。

中期可以评估：

- 将 login/register 也迁入 SPA。
- auth API 返回 JSON，页面由 React 渲染。
- 对 OAuth、magic link、OTP callback 保留 server landing route。

### 插件系统

插件是 SPA 化的主要边界风险。

需要分三类处理：

1. 只提供 server API 的插件：直接给 SPA 调用。
2. 提供 admin HTML route 的插件：迁移期保留 legacy iframe/HTML link 或旧 route。
3. 提供 React admin extension 的插件：长期目标，定义 manifest contract。

建议新增插件 admin manifest 字段：

```ts
type AdminPluginUi =
  | { type: 'legacy-route'; path: string }
  | { type: 'spa-route'; path: string; module: string }
  | { type: 'external-link'; href: string }
```

第一阶段不强制所有插件 SPA 化，但菜单和权限数据需要通过 `/admin/api/me` 或 `/admin/api/plugins/menu` 暴露给 admin。

### 旧模板的迁移期处理

迁移期保留旧模板，不要一次删掉：

- 已迁移页面：server 页面 route 改成 SPA fallback，数据 route 改成 JSON API。
- 未迁移页面：继续走旧 `c.html(renderXxxPage(data))`。
- 页面链接可以先混合跳转；React Router 对未迁移页面使用 `window.location.href` 或普通 `<a>`。
- 所有旧 `renderAlert`、HTMX fragment endpoint 最终都要替换成 JSON response。

## Worker 部署需要更新的地方

### 构建流程

推荐构建顺序：

```sh
pnpm --filter @worker-blog/admin build
pnpm --filter @worker-blog/server deploy
```

root `package.json` 可以增加：

```json
{
  "scripts": {
    "build": "pnpm -r --if-present build",
    "deploy": "pnpm --filter @worker-blog/admin build && pnpm --filter @worker-blog/server deploy"
  }
}
```

server deploy 前要能读到 admin build 输出，例如：

```txt
packages/admin/dist/
  index.html
  assets/
```

### Wrangler assets 配置

Cloudflare Worker 推荐使用 Workers Assets 托管 SPA 静态文件。`packages/server/wrangler.toml` 需要补充 assets 配置，并修正 R2 binding：

```toml
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "../admin/dist"
binding = "ASSETS"

[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "worker-blog-media"
```

注意：

- `directory` 是相对 `packages/server/wrangler.toml` 的路径。
- 当前代码使用 `c.env.MEDIA_BUCKET`，所以 binding 不应叫 `BUCKET`。
- `Bindings` 里已有 `ASSETS: Fetcher`，但 route 仍需要显式调用或让 Workers Assets fallback 生效。
- 本地 `wrangler dev` 也要验证 assets 可以被访问。

### Assets fallback 策略

推荐由 Hono 显式处理。Vite build 默认会把文件放在 `dist/assets/*`，如果生产 URL 使用 `/admin/assets/*`，server 需要把请求路径 rewrite 到 assets 目录中的真实文件：

```ts
app.get('/admin/assets/*', async (c) => {
  const url = new URL(c.req.url)
  url.pathname = url.pathname.replace(/^\/admin\/assets\//, '/assets/')
  return c.env.ASSETS.fetch(new Request(url, c.req.raw))
})

app.get('/admin/*', async (c) => {
  if (isApiOrAssetRequest(c)) return c.notFound()
  return c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url), c.req.raw))
})
```

需要确认：

- `/admin/api/*` 不会被 SPA fallback 吞掉。
- 旧未迁移 HTML route 的优先级高于 fallback。
- hard refresh `/admin/content/123/edit` 能返回 SPA shell。
- `/admin/assets/...` 能正确命中 `packages/admin/dist/assets/...`。
- Vite 输出的 Tailwind CSS asset 能被 shell 正确引用和缓存。
- assets 使用 hashed filename 后可设置 `Cache-Control: public, max-age=31536000, immutable`。
- `index.html` 不长期缓存，避免发布后用户卡旧入口。

### Worker 限制

SPA 化时要避免这些 Worker 风险：

- 不在 Worker bundle 内 import 浏览器 React app 入口，否则会把 client 代码打进 server。
- server 只读 `dist/index.html` 或通过 `ASSETS.fetch` 服务静态文件。
- 不依赖 Node-only API 处理 assets。
- Tailwind 和 shadcn/ui 只参与 admin build，Worker 运行时不需要 Tailwind/PostCSS。
- 上传继续走 Worker/R2 API，不让 Vite dev server 代理逻辑成为生产依赖。
- API response 要控制大小，列表分页不能一次把大量内容塞给浏览器。

## Phase 1: SPA 基础设施

目标：让 `/admin/*` 可以打开 React SPA，但不迁移业务页面。

Admin：

- 新增 Vite + React 入口。
- 新增 Tailwind CSS、PostCSS、shadcn/ui 配置。
- 新增基本 layout、router、not found 页面。
- 新增 API client、CSRF helper、auth error handling。
- 新增基础样式入口和 shadcn/ui theme tokens，先复用现有 admin 信息架构。

Server：

- 新增 SPA shell/assets route。
- 保留所有旧 admin route。
- 新增 `/admin/api/me`。
- 修正 `wrangler.toml` assets 和 R2 binding。

验收标准：

- `pnpm type-check` 通过。
- `pnpm --filter @worker-blog/admin build` 通过。
- `wrangler dev` 下 `/admin/spa-test` hard refresh 返回 SPA。
- `/admin/dashboard` 等旧页面仍可打开。
- `/admin/api/me` 在登录后返回当前用户信息。

## Phase 2: 基础组件和 Layout

目标：用 shadcn/ui + Tailwind CSS 建立 SPA 页面会反复使用的 UI 基础。

Admin：

- 迁移 sidebar/topbar/plugin menu。
- 引入首批 shadcn/ui 组件，并建立 `src/spa/components/ui/` 维护约定。
- 迁移 alert、table、pagination、filter bar、dialog、empty state。
- 建立 page header、form field、loading、error boundary。
- 建立 Tailwind theme token、dark mode、focus ring 和表单错误样式。
- 建立权限判断和 feature flag 显示方式。

Server：

- 提供 plugin menu JSON。
- 提供 app metadata JSON。
- 确认 security headers 允许 SPA JS/CSS assets、editor CDN 和必要 API。

验收标准：

- SPA layout 能展示当前用户、菜单、版本号。
- 深色模式和导航状态正常。
- shadcn/ui 组件在 Worker build 后样式正常，没有 Tailwind purge 丢 class。
- API error/loading 空状态可复用。

## Phase 3: 低风险页面迁移

目标：迁移展示型页面，验证 API 化节奏。

候选：

- dashboard
- logs list
- log details
- log config
- api reference
- plugins list

每个页面迁移步骤：

1. 从旧 route 抽出数据查询函数。
2. 新增 `/admin/api/...` JSON endpoint。
3. 在 `shared` 定义 response schema/type。
4. 新增 React page 调 API 渲染。
5. 旧 HTML route 改为 SPA fallback 或保留兼容 redirect。
6. 删除该页面对旧 template 的 server import。

验收标准：

- 页面直接访问和浏览器内导航都正常。
- loading/error/empty 状态完整。
- server route 测试覆盖 API response。
- 旧页面 URL 不 404。

## Phase 4: 表单页面迁移

目标：迁移 settings、users、collections 等常规 CRUD 表单。

重点：

- 用 Zod schema 统一前后端校验契约。
- mutating API 返回 JSON。
- 表单错误用字段级 errors 显示。
- 保存成功后由 SPA 更新 query cache 或跳转。
- 保留普通 multipart/form-data 上传能力。

候选：

- settings
- users list/new/edit/profile
- collections list/form
- plugin settings

验收标准：

- 创建、编辑、删除、启用/禁用行为正常。
- 422 校验错误不丢字段输入。
- 401/403/CSRF 错误可被用户理解。

## Phase 5: 复杂页面迁移

目标：迁移富交互和第三方编辑器页面。

候选：

- content list/form
- media library
- forms builder
- public form submission admin views
- rich text editor plugin settings
- database tools

策略：

- content form 先迁移字段渲染和保存，再迁移 preview、version history、编辑器插件。
- media library 先迁移列表和上传，再迁移 picker、批量操作、详情面板。
- forms builder 先迁移列表和基础编辑，再迁移拖拽和复杂字段配置。
- 编辑器组件要隔离 DOM ownership，不让 React 和第三方编辑器同时控制同一节点。

验收标准：

- 文件上传、R2 删除、重命名、批量操作正常。
- 编辑器初始化、保存、切换插件正常。
- version history、preview、dynamic fields 不回退。

## Phase 6: 插件 Admin UI

目标：给插件提供长期 SPA 扩展机制。

计划：

- 定义插件 admin UI manifest。
- 旧插件 admin route 保留 legacy link。
- 新插件可注册 SPA route、菜单项、权限要求。
- 评估是否允许插件提供独立 client bundle。

验收标准：

- 未迁移插件仍可从 SPA 菜单进入。
- 新 SPA 插件页面能通过 manifest 加入导航。
- 插件 API 和权限错误处理一致。

## Phase 7: 移除旧模板

目标：server 不再依赖 admin HTML templates。

完成条件：

- 所有 `/admin/*` 页面都由 SPA 渲染。
- 所有 HTMX fragment endpoint 都替换为 JSON API。
- 插件 legacy route 有明确保留清单或迁移计划。
- `@worker-blog/admin/templates` 不再被 server core import。

清理：

- 删除不再使用的 template 文件。
- 删除旧 layout 中的 HTMX/CSRF 注入脚本。
- 简化 admin package exports。
- 收敛 route tests 到 API tests + SPA smoke tests。

## 类型边界

页面数据类型迁移到 API contract：

- 只属于 React component 内部的 props 留在 admin。
- request/response 类型和 Zod schema 放到 shared。
- 数据库 row、Drizzle schema、service 内部类型留在 server。
- 插件 manifest 的公开字段放到 shared。
- admin API client 使用 shared schema parse response，避免隐式 any。

推荐结构：

```txt
packages/shared/src/admin-api/
  auth.ts
  dashboard.ts
  logs.ts
  plugins.ts
  content.ts
  media.ts
```

## 风险

主要风险：

- API 化范围大，旧 server route 中页面级数据整理逻辑需要拆分。
- 插件 admin route 形态不统一，可能长期混合 SPA 和 legacy HTML。
- CSRF、cookie auth、fetch redirect 的细节容易造成保存失败。
- Worker assets fallback 路由顺序错误会吞掉 API 或旧页面。
- Vite client bundle 可能被误 import 到 Worker server bundle。
- 富文本编辑器和 React DOM ownership 冲突。

控制方式：

- 每次只迁移一个页面或一个 feature。
- 先加 API，再切页面 route。
- 对迁移页面保留旧 URL。
- 对每个 mutating API 写最小 route test。
- 用 hard refresh 检查每个 SPA route。
- Worker 部署前检查 `wrangler.toml` binding 和 assets 输出。

## 验证清单

每个迁移 PR 至少验证：

```sh
pnpm type-check
pnpm --filter @worker-blog/admin build
pnpm --filter @worker-blog/server test
```

页面级迁移还应手动检查：

- 直接访问页面 URL。
- SPA 内导航。
- 浏览器刷新。
- 401/403 行为。
- CSRF mutating request。
- 表单校验错误。
- 插件菜单。
- shadcn/ui 组件样式、暗色模式和 focus 状态。
- Tailwind CSS asset 在 Worker dev 下正常加载。
- Worker dev 下 assets 加载。

复杂页面补充：

- 文件上传和删除。
- 编辑器初始化和保存。
- 大列表分页和筛选。
- 移动宽度下基础布局。

## 推荐第一步

推荐先做 Phase 1，而不是直接迁移某个业务页面：

1. 在 `packages/admin` 建 Vite React SPA skeleton。
2. 在 `packages/server` 加 `/admin/assets/*` 和 `/admin/*` SPA fallback。
3. 加 `/admin/api/me`。
4. 修正 `wrangler.toml` 的 `[assets]` 和 `MEDIA_BUCKET` binding。
5. 让一个 `/admin/spa-test` 页面能在 Worker dev 下 hard refresh 成功。

这一步完成后，再迁移 `admin-log-config` 或 `dashboard`。它们数据结构简单，适合验证 “旧 HTML 页面 -> JSON API + React route” 的完整链路。
