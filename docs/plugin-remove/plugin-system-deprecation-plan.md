# Plugin 系统退场整理方案

## 背景

当前项目里的 plugin 系统已经不适合继续按“可安装、可卸载、可动态扩展的插件平台”维护。

主要原因：

- `packages/server` 里存在 `PluginBuilder`、`PluginManager`、manifest registry、hook system、plugin DB 表等完整插件平台抽象。
- 但实际运行时很多功能仍然是手动 import、手动 route 到 Hono app 上。
- `packages/admin` 只实现了通用插件列表和通用 settings 页面，没有完整承接各插件自己的 admin UI。
- 部分 server 插件仍然声明 `/admin/plugins/...` 服务端 HTML 页面，但当前路由挂载逻辑主要只处理 `/api/*` 和 `/auth/*`。
- 维护“插件平台”的成本高于它当前提供的收益。

建议方向：不要继续修补 plugin system，而是把现有插件收敛为普通内建功能模块。

## 目标

- 停止维护动态插件平台。
- 保留现有产品功能，避免大规模功能回归。
- 把“plugin”概念逐步降级为“built-in feature/module”。
- 让 server 和 admin 的路由、设置、权限模型更显式。
- 逐步删除不再需要的插件平台抽象。

## 总体策略

不要一开始就删除所有 plugin 代码。

推荐先做“冻结 + 兼容”，再逐步迁移功能模块，最后删除平台层。

## 当前插件盘点

### 前端插件相关代码

`packages/admin` 里没有真正的前端插件运行时，主要是通用插件管理界面和少量旧模板编辑器适配代码。

| 类型 | 位置 | 用途 | 处理建议 |
|------|------|------|----------|
| 插件列表页 | `packages/admin/src/spa/pages/plugins-list.tsx`、`packages/admin/src/spa/api/plugins.ts` | 调 `/api/admin/plugins` 展示插件/功能状态。 | 改名为 Features/System Features，作为过渡只读或设置入口。 |
| 插件设置页 | `packages/admin/src/spa/pages/plugin-settings.tsx`、`packages/admin/src/spa/api/plugin-settings.ts` | 调 `/api/admin/plugin-settings/:id/settings`，按 manifest schema 渲染通用表单。 | 短期保留，长期迁到明确 feature settings 页面。 |
| SPA 导航 | `packages/admin/src/spa/layouts/admin-layout.tsx`、`packages/admin/src/spa/router.tsx` | 注册 `/admin/plugins`、`/admin/plugins/:id/settings`，并尝试渲染 `pluginMenu`。 | 主导航改名或隐藏；动态 plugin menu 不应继续作为核心机制。 |
| EasyMDE | `packages/admin/src/plugins/easy-mdx.ts`、`packages/admin/src/plugins/available/easy-mdx/index.ts` | 输出 EasyMDE CDN 和初始化脚本。 | 旧模板编辑器适配，随旧 template admin 迁移/删除。 |
| TinyMCE | `packages/admin/src/plugins/tinymce-plugin.ts`、`packages/admin/src/plugins/available/tinymce-plugin/index.ts` | 输出 TinyMCE CDN 和初始化脚本。 | 旧模板编辑器适配，保留到内容编辑器路线明确后再处理。 |
| Quill | `packages/admin/src/plugins/core-plugins/quill-editor/index.ts` | 输出 Quill CDN 和初始化脚本。 | 旧模板编辑器适配，随旧 template admin 迁移/删除。 |
| 旧模板插件页面 | `packages/admin/src/templates/pages/admin-plugins-list.template.ts`、`packages/admin/src/templates/pages/admin-plugin-settings.template.ts` | 旧服务端渲染插件列表/设置页面，包含 install/uninstall/activate/deactivate 语义。 | 标记 legacy；不要继续扩展。 |

### 后端插件清单

后端 manifest 位于 `packages/server/src/plugins/**/manifest.json`，当前共 27 个：

| ID | 名称 | 类别 | Core? | 用途 |
|----|------|------|-------|------|
| `core-auth` | Authentication System | security | 是 | 登录、用户、角色、会话和 RBAC。 |
| `core-media` | Media Manager | media | 是 | 媒体上传、管理、优化、缩略图和存储集成。 |
| `core-cache` | Cache System | system | 是 | 内存/KV 多层缓存、TTL 和失效策略。 |
| `core-analytics` | Analytics & Insights | seo | 是 | 页面访问、事件、行为和内容表现统计。 |
| `ai-search` | AI Search | content | 是 | 全文/语义搜索和 RAG 相关索引服务。 |
| `oauth-providers` | OAuth Providers | authentication | 是 | GitHub、Google 等 OAuth/OIDC 登录。 |
| `quill-editor` | Quill Rich Text Editor | editor | 是 | Quill 富文本编辑器集成。 |
| `stripe` | Stripe Subscriptions | payments | 是 | Stripe checkout、订阅、webhook 和订阅权限。 |
| `turnstile` | Cloudflare Turnstile | security | 是 | Cloudflare Turnstile 表单验证。 |
| `user-profiles` | User Profiles | users | 是 | 可配置用户 profile 字段。 |
| `database-tools` | Database Tools | development | 否 | 数据库管理、迁移、备份、校验、查询工具。 |
| `seed-data` | Seed Data Generator | development | 否 | 开发/demo 示例数据生成。 |
| `workflow-plugin` | Workflow Engine | content | 否 | 内容工作流、审批、状态流转、调度和自动化。 |
| `easy-mdx` | EasyMDE Markdown Editor | editor | 否 | Markdown 编辑器集成。 |
| `tinymce-plugin` | TinyMCE Rich Text Editor | editor | 否 | TinyMCE 富文本编辑器集成。 |
| `magic-link-auth` | Magic Link Authentication | security | 否 | 邮件 magic link 免密登录。 |
| `otp-login` | OTP Login | security | 否 | 邮件一次性验证码登录。 |
| `email` | Email | utilities | 否 | 通过 Resend 发送事务邮件。 |
| `global-variables` | Global Variables | content | 否 | 内容中的全局变量 key-value 替换。 |
| `security-audit` | Security Audit | security | 否 | 安全事件日志、暴力破解检测和安全仪表盘。 |
| `shortcodes` | Shortcodes | content | 否 | 服务端 shortcode 解析和管理。 |
| `testimonials-plugin` | Testimonials | content | 否 | 客户评价/评分内容管理。 |
| `code-examples-plugin` | Code Examples | content | 否 | 代码片段内容库。 |
| `demo-login-plugin` | Demo Login | utilities | 否 | Demo 登录辅助。 |
| `hello-world` | Hello World | utilities | 否 | 示例插件。 |
| `design` | Design System | utilities | 否 | 设计 token/theme/component 管理。 |
| `redirect-management` | Redirect Management | utilities | 否 | URL 重定向规则管理。 |

需要注意：这些 manifest 不代表它们真的被动态加载。实际运行时大量功能仍在 `packages/server/src/app.ts` 里手动 import 和 route。

### 数据库插件表

项目里确实有插件相关 DB 表，定义在 `packages/server/migrations/006_plugin_system.sql`，并映射在 `packages/server/src/db/schema.ts`：

| 表 | 用途 | 退场处理 |
|----|------|----------|
| `plugins` | 主插件/功能表，存 display metadata、status、`is_core`、`settings`、permissions、dependencies、安装/更新时间等。 | 暂时保留，作为 feature settings/status 兼容层。 |
| `plugin_hooks` | 记录插件 hook handler、优先级和启用状态。 | 平台层退场后删除候选。 |
| `plugin_routes` | 记录插件 route path/method/handler。 | 当前路由主要是代码显式挂载，后续删除候选。 |
| `plugin_assets` | 记录插件 CSS/JS/image/font 资产和加载顺序。 | 如果没有实际 asset loader 消费，可删除。 |
| `plugin_activity_log` | 记录 install/activate/deactivate/settings/error 等插件活动。 | 移除插件管理语义后，可迁到 feature settings audit 或删除。 |

当前未看到真实定义的 `plugin_settings` 表；插件设置主要存在 `plugins.settings`。

## 阶段 1：冻结插件平台

短期先停止把它当作可扩展平台维护。

建议动作：

- 不再新增第三方插件安装能力。
- 不再扩展 install、uninstall、activate、deactivate 这些平台能力。
- 新功能不要继续放进 `packages/server/src/plugins/*`。
- 新功能应放到明确的功能目录，例如：
  - `packages/server/src/features/*`
  - `packages/admin/src/spa/pages/*`
  - `packages/admin/src/spa/api/*`
- 将以下平台抽象标记为 deprecated：
  - `PluginManager`
  - `PluginRegistryImpl`
  - `PluginBuilder`
  - `hook-system`
  - `plugin-validator`
  - manifest registry generator

这个阶段不要破坏现有功能，只是停止继续扩大 plugin 系统的使用面。

## 阶段 2：保留功能，改成内建模块

当前很多“插件”本质上是产品内建功能，不应继续依赖插件平台叙事。

可以优先归类为内建功能模块：

- auth
- media
- cache
- analytics
- ai search
- stripe
- oauth providers
- otp login
- magic link auth
- workflow
- security audit
- global variables
- user profiles
- database tools
- seed data

建议逐步迁移到类似结构：

```text
packages/server/src/features/ai-search
packages/server/src/features/security-audit
packages/server/src/features/stripe
packages/server/src/features/cache
```

admin 侧也改为显式页面/API：

```text
packages/admin/src/spa/pages/ai-search.tsx
packages/admin/src/spa/pages/security-audit.tsx
packages/admin/src/spa/api/ai-search.ts
packages/admin/src/spa/api/security-audit.ts
```

## 阶段 3：保留 DB 兼容层

不建议立刻删除 `plugins` 表。

短期可以继续把它当作 feature settings/status 的兼容层。

建议：

- 保留 `plugins.settings` 用于读取旧配置。
- 不再把 `plugins.status` 当作真正的运行时启停开关。
- 对关键功能使用显式配置，例如：
  - `feature_settings`
  - `system_settings`
  - 或专用设置表
- 如果暂时不迁表，可以先封装一个 `FeatureSettingsService`，内部仍然读取旧 `plugins` 表。

这样可以避免一次性迁移所有 settings 数据。

## 阶段 4：调整 Admin 体验

当前 `packages/admin` 的插件相关入口：

- `/admin/plugins`
- `/admin/plugins/:id/settings`
- `/api/admin/plugins`
- `/api/admin/plugin-settings/:id/settings`

建议处理方式：

- 将 “Plugins” 页面改名为 “Features” 或 “System Features”，或者先从主导航隐藏。
- 移除 install/uninstall/activate/deactivate 的产品语义。
- 保留只读列表或设置入口，作为过渡期管理页面。
- 对重要功能逐个改成独立页面：
  - `/admin/ai-search`
  - `/admin/security`
  - `/admin/analytics`
  - `/admin/billing`
  - `/admin/cache`

长期目标是让 admin SPA 不再依赖通用 plugin settings 页面，而是每个功能有明确页面和 API 契约。

## 阶段 5：显式化 Server 路由

当前 `packages/server/src/app.ts` 里存在插件路由手动挂载和 helper 混用。

需要逐步把这种形式：

```ts
if (somePlugin.routes && somePlugin.routes.length > 0) {
  registerApiPluginRoutes(app, somePlugin.routes as any)
}
```

改为显式功能路由：

```ts
app.route('/api/admin/ai-search', aiSearchAdminApiRoutes)
app.route('/api/search', searchPublicRoutes)
app.route('/api/admin/security-audit', securityAuditAdminApiRoutes)
```

建议优先处理这些位置：

- `registerApiPluginRoutes`
- `/admin/plugins/...` 服务端 HTML admin routes
- `pluginMenuMiddleware`
- `adminApiPluginSettingsRoutes`
- `adminApiPluginsRoutes`

## 阶段 6：删除平台层

等主要功能都迁成显式模块后，再删除插件平台层。

候选删除对象：

- `packages/server/src/plugins/plugin-manager.ts`
- `packages/server/src/plugins/plugin-registry.ts`
- `packages/server/src/plugins/hook-system.ts`
- `packages/server/src/plugins/plugin-validator.ts`
- `packages/server/src/plugins/sdk/plugin-builder.ts`
- `packages/server/src/plugins/manifest-registry.ts`
- 插件 registry 生成脚本
- 不再使用的 manifest.json
- 不再使用的 `plugin_hooks`
- 不再使用的 `plugin_routes`
- 不再使用的 `plugin_assets`

`plugins` 表可以最后处理，因为它可能仍承载 settings 兼容数据。

## 当前已知问题

### 动态菜单可能没有生效

`pluginMenuMiddleware` 被挂载在 `/api/admin/*`，但内部判断的是请求路径是否以 `/admin` 开头。

这意味着 `/api/admin/me` 很可能拿不到动态 plugin menu，React admin layout 中的 `pluginMenu` 通常会是空的。

### Server 插件 Admin HTML 页面没有统一接入 SPA

不少插件声明了 `/admin/plugins/...` 服务端 HTML 页面。

但当前 `registerApiPluginRoutes` 只挂载：

- `/api/*`
- `/auth/*` 到 `/api/auth/*`

不会统一挂载 `/admin/*` 插件页面。

### Admin SPA 只支持通用插件 settings

React admin 当前只有：

- 插件列表
- 通用 settings 表单

它没有完整支持各插件自定义 UI、复杂 workflow 或服务端 HTML 页面。

## 推荐迁移顺序

1. 冻结 plugin 平台，不再新增基于插件系统的能力。
2. 隐藏或改名 admin 的 Plugins 入口。
3. 先迁移最常用、最核心的功能：
   - auth
   - media
   - cache
   - ai search
   - analytics
4. 为这些功能建立显式 server route 和 admin API。
5. 把 settings 从 `plugins.settings` 包一层兼容 service。
6. 逐步删除未使用的 server HTML admin plugin routes。
7. 最后删除 PluginBuilder/PluginManager/registry/hook 等平台层。

## 结论

推荐方案不是“修好 plugin 系统”，而是“让 plugin 系统退场”。

保留现有功能，但把它们重新定义为内建模块。短期兼容旧 DB 和旧路径，中期迁移到显式 feature route 和 admin page，长期删除插件平台抽象。
