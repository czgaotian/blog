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

推荐先做“前端去入口 + 后端保功能”，再逐步迁移功能模块，最后删除平台层。

当前明确决策：

- 前端移除 `/admin/plugins`、`/admin/plugins/:id/settings` 这类通用插件管理 UI。
- 前端编辑器相关适配暂时保留，标记 TODO，后续单独处理内容编辑器路线。
- 后端不按“插件平台”继续修补；保留现有功能，把插件实现逐步改成内建模块。
- 后端 plugin 配置接口也移除；所有功能先作为内建能力存在，不提供插件启停/配置入口。

## 当前执行状态

已开始按上述决策执行：

- React SPA 的通用 plugin 管理页面、路由、API client、导航入口和 `pluginMenu` 渲染已移除。
- 旧服务端渲染的通用 plugin 列表/settings 模板已移除，legacy admin layout 中的 Plugins 菜单和动态 plugin menu 注入也已移除。
- 后端 `/api/admin/plugins`、`/api/admin/plugin-settings/:id/settings` 以及对应 shared admin-api contract 已移除。
- `PluginBootstrapService`、`PluginService`、plugin menu middleware 的运行时挂载已移除。
- 已处理一批运行时功能，使其不再通过 `plugins.status`/`plugins.settings` 控制行为或读取配置。
- 平台层代码已删除：`PluginBuilder`、plugin manager、plugin registry、hook system、plugin validator、generated manifest registry、shared plugin types。
- plugin DB schema 已从 Drizzle schema 移除；历史 plugin registry/config migrations 已改为 no-op 或剥离 plugin metadata 写入，并新增 `037_drop_plugin_platform_tables.sql` 删除旧平台表。
- EasyMDE/TinyMCE/Quill 编辑器适配已保留并加 TODO，等待后续内容编辑器路线决定。
- `pnpm type-check` 和相关 server 测试已通过。

仍需后续阶段处理：

- 部分功能仍在 `packages/server/src/plugins/*` 目录下，后续应迁移到明确的 built-in feature 目录和路由命名。
- manifest JSON、README、部分注释仍使用 plugin 叙事，需要后续文案/元数据清理。
- TinyMCE 相关 `PluginManager` 字样属于 TinyMCE 编辑器 API，不是已删除的 Worker Blog plugin 平台。

## 当前插件盘点

### 前端插件相关代码

`packages/admin` 里没有真正的前端插件运行时，主要是通用插件管理界面和少量旧模板编辑器适配代码。

| 类型 | 位置 | 用途 | 处理建议 |
|------|------|------|----------|
| 插件列表页 | `packages/admin/src/spa/pages/plugins-list.tsx`、`packages/admin/src/spa/api/plugins.ts` | 调 `/api/admin/plugins` 展示插件/功能状态。 | 删除；后端对应 `/api/admin/plugins` 也删除。 |
| 插件设置页 | `packages/admin/src/spa/pages/plugin-settings.tsx`、`packages/admin/src/spa/api/plugin-settings.ts` | 调 `/api/admin/plugin-settings/:id/settings`，按 manifest schema 渲染通用表单。 | 删除；后端对应 plugin settings API 也删除。 |
| SPA 导航 | `packages/admin/src/spa/layouts/admin-layout.tsx`、`packages/admin/src/spa/router.tsx` | 注册 `/admin/plugins`、`/admin/plugins/:id/settings`，并尝试渲染 `pluginMenu`。 | 移除 Plugins 导航、路由和动态 plugin menu 渲染。 |
| EasyMDE | `packages/admin/src/plugins/easy-mdx.ts`、`packages/admin/src/plugins/available/easy-mdx/index.ts` | 输出 EasyMDE CDN 和初始化脚本。 | 暂时保留；加 TODO，后续按内容编辑器路线统一处理。 |
| TinyMCE | `packages/admin/src/plugins/tinymce-plugin.ts`、`packages/admin/src/plugins/available/tinymce-plugin/index.ts` | 输出 TinyMCE CDN 和初始化脚本。 | 暂时保留；加 TODO，后续按内容编辑器路线统一处理。 |
| Quill | `packages/admin/src/plugins/core-plugins/quill-editor/index.ts` | 输出 Quill CDN 和初始化脚本。 | 暂时保留；加 TODO，后续按内容编辑器路线统一处理。 |
| 旧模板插件页面 | `packages/admin/src/templates/pages/admin-plugins-list.template.ts`、`packages/admin/src/templates/pages/admin-plugin-settings.template.ts` | 旧服务端渲染插件列表/设置页面，包含 install/uninstall/activate/deactivate 语义。 | 删除或标记为待删除 legacy；不要继续扩展。 |

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
| `plugins` | 主插件/功能表，存 display metadata、status、`is_core`、`settings`、permissions、dependencies、安装/更新时间等。 | 不再作为配置来源；确认功能不依赖后删除。 |
| `plugin_hooks` | 记录插件 hook handler、优先级和启用状态。 | 平台层退场后删除候选。 |
| `plugin_routes` | 记录插件 route path/method/handler。 | 当前路由主要是代码显式挂载，后续删除候选。 |
| `plugin_assets` | 记录插件 CSS/JS/image/font 资产和加载顺序。 | 如果没有实际 asset loader 消费，可删除。 |
| `plugin_activity_log` | 记录 install/activate/deactivate/settings/error 等插件活动。 | 移除插件管理语义后删除。 |

当前未看到真实定义的 `plugin_settings` 表；现有插件设置主要存在 `plugins.settings`，但后续不再保留 plugin 配置模型。

## 阶段 1：冻结插件平台

短期先停止把它当作可扩展平台维护，并移除前端通用插件管理入口。

建议动作：

- 不再新增第三方插件安装能力。
- 不再扩展 install、uninstall、activate、deactivate 这些平台能力。
- 删除 React SPA 中的 `/admin/plugins`、`/admin/plugins/:id/settings` 路由和导航入口。
- 删除对应的通用插件列表/settings 页面和 SPA API hook。
- 删除后端通用 plugin 管理 API：`/api/admin/plugins`、`/api/admin/plugin-settings/:id/settings`。
- 删除 `PluginService` 中仅服务于插件安装、启停、配置、hook/route 注册、activity log 的平台能力。
- 移除 AdminLayout 对 `pluginMenu` 的动态渲染依赖。
- 旧模板插件管理页面可以同步删除；如果短期担心引用遗漏，先标记 TODO/legacy 并从路由断开。
- EasyMDE/TinyMCE/Quill 编辑器适配暂时保留，只加 TODO，不纳入本轮 plugin UI 删除。
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

迁移原则：

- 功能保留，平台语义退场。
- 后端目录、导出、路由逐步从 `plugins/*` 迁到 `features/*`。
- 每个功能暴露明确的 route 和 service，而不是通过 `PluginBuilder`、manifest、`PluginService` 间接声明。
- 所有迁移后的功能先按内建能力默认存在，不通过 `plugins.status` 或 plugin settings 启停/配置。
- 不新增 `FeatureSettingsService`；当前决策是不保留 plugin 配置层。

建议逐步迁移到类似结构：

```text
packages/server/src/features/ai-search
packages/server/src/features/security-audit
packages/server/src/features/stripe
packages/server/src/features/cache
```

admin 侧只在确实需要产品页面时新增显式页面/API，不再提供通用 plugin settings 页面：

```text
packages/admin/src/spa/pages/ai-search.tsx
packages/admin/src/spa/pages/security-audit.tsx
packages/admin/src/spa/api/ai-search.ts
packages/admin/src/spa/api/security-audit.ts
```

## 阶段 3：移除 Plugin 配置层和 DB 依赖

不再保留 plugin 配置接口，也不再把 `plugins.settings` 作为功能配置来源。

建议：

- 删除 `/api/admin/plugins` 和 `/api/admin/plugin-settings/:id/settings`。
- 删除前端对这些接口的调用。
- 移除 `PluginBootstrapService` 对插件表的自动安装/激活逻辑。
- 清理运行时对 `plugins.status` 的依赖；功能默认内建可用。
- 清理运行时对 `plugins.settings` 的依赖；如确有必要，改为代码默认值或环境变量，但不要新建“插件配置”模型。
- 待所有引用清理完成后，删除 `plugins`、`plugin_hooks`、`plugin_routes`、`plugin_assets`、`plugin_activity_log` 表及相关迁移/清理逻辑。

## 阶段 4：调整 Admin 体验

当前 `packages/admin` 的插件相关入口：

- `/admin/plugins`
- `/admin/plugins/:id/settings`
- `/api/admin/plugins`
- `/api/admin/plugin-settings/:id/settings`

建议处理方式：

- 直接移除 React SPA 的 “Plugins” 页面、设置页、路由、导航和对应 API hook。
- 不再保留通用插件列表作为过渡入口。
- 移除 install/uninstall/activate/deactivate 的产品语义和可见入口。
- 同步移除后端 `/api/admin/plugins`、`/api/admin/plugin-settings/:id/settings`，不再保留 plugin 配置接口。
- 编辑器适配代码本轮不删，只加 TODO，后续和内容编辑器重构一起处理。
- 对重要功能逐个改成独立页面：
  - `/admin/ai-search`
  - `/admin/security`
  - `/admin/analytics`
  - `/admin/billing`
  - `/admin/cache`

长期目标是让 admin SPA 不再依赖任何通用 plugin 管理/配置页面；功能页面只围绕实际产品能力存在。

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

`plugins` 表不再作为配置兼容层；等运行时引用清空后随平台层一起删除。

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
2. 删除前端通用 Plugins UI：导航、路由、页面、SPA API hook、动态 plugin menu 渲染。
3. 编辑器适配保留 TODO，不在本轮删除。
4. 先迁移最常用、最核心的后端功能：
   - auth
   - media
   - cache
   - ai search
   - analytics
5. 为这些功能建立显式 server route；仅在产品确实需要时新增 feature-specific admin API。
6. 删除后端通用 plugin admin API：`adminApiPluginsRoutes`、`adminApiPluginSettingsRoutes`。
7. 清理 `plugins.status`、`plugins.settings`、`PluginBootstrapService`、`PluginService` 等运行时依赖，功能改为内建默认可用。
8. 逐步删除未使用的 server HTML admin plugin routes。
9. 删除 manifest registry、PluginBuilder/PluginManager/registry/hook 和 plugin DB 表等平台层。

## 结论

推荐方案不是“修好 plugin 系统”，而是“让 plugin 系统退场”。

保留现有功能，但把它们重新定义为内建模块。前端先删除通用 plugin 管理 UI；后端同步删除 plugin 管理/配置接口，不再用 `plugins.status` 或 `plugins.settings` 驱动功能。中期迁移到显式 feature route，长期删除插件平台抽象和 plugin DB 表。
