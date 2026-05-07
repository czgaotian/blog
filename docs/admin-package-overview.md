# Admin Package Overview

本文说明 `@worker-blog/admin` 包当前在 Worker Blog 中的职责、运行方式和与 `server`、`shared` 包的关系。

## 这个包负责什么

`packages/admin` 目前主要是后台管理界面的 UI 包。它不负责启动 HTTP 服务，也不直接处理请求、鉴权、数据库查询或插件生命周期；这些 runtime 行为仍然在 `packages/server` 中完成。

admin 包的核心输出是 HTML template 函数：

- 页面模板：如 dashboard、content list、content form、settings、plugins、logs。
- 布局模板：如 `admin-layout-v2` 和 `admin-layout-catalyst`。
- 通用组件模板：如 table、form、pagination、alert、confirmation dialog。
- 少量 UI 辅助代码：例如富文本编辑器的 CDN 资源和初始化脚本。

当前 `packages/admin/package.json` 只公开这些入口：

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./templates": "./src/templates/index.ts",
    "./templates/*": "./src/templates/*.ts"
  }
}
```

也就是说，`@worker-blog/admin` 的正式公共边界是 templates。

## 请求是怎么跑起来的

后台请求的主流程仍然从 server 开始：

1. `packages/server/src/app.ts` 创建 Hono app。
2. server 给 `/admin/*` 注册鉴权和角色中间件。
3. server 挂载各个 admin 路由，例如 `/admin/content`、`/admin/dashboard`、`/admin/settings`。
4. admin 路由从数据库、插件服务、配置服务中读取数据。
5. 路由把数据整理成页面模板需要的 `PageData`。
6. 路由调用 `@worker-blog/admin/templates/...` 中的 render 函数。
7. render 函数返回 HTML 字符串。
8. server 用 `c.html(...)` 把 HTML 返回给浏览器。

以内容编辑页为例：

```ts
import {
  renderContentFormPage
} from '@worker-blog/admin/templates/pages/admin-content-form.template'

// server route 中查询 collection、content、plugin 状态后：
return c.html(renderContentFormPage(formData))
```

所以 admin 包不是一个独立运行的应用。它更像是 server 使用的后台 UI 渲染库。

## 包之间的依赖方向

当前理想的依赖方向是：

```txt
server -> admin
server -> shared
admin  -> shared
```

含义是：

- `server` 负责运行时：Hono routes、中间件、数据库访问、插件服务、Worker bindings。
- `admin` 负责 UI：HTML 模板、页面结构、后台组件、编辑器资源注入。
- `shared` 负责通用契约：跨包类型、纯工具函数、通用 schema。

admin 包应该避免依赖 server 包。当前代码里还有一些迁移期遗留，比如 `admin/src/db/schema.ts` re-export server schema，这种依赖方向后续应该被清理。

## templates 目录

`packages/admin/src/templates` 是 admin 包的主体。

常见结构：

```txt
templates/
  layouts/
    admin-layout-v2.template.ts
    admin-layout-catalyst.template.ts
  components/
    table.template.ts
    form.template.ts
    pagination.template.ts
    dynamic-field.template.ts
  pages/
    admin-content-list.template.ts
    admin-content-form.template.ts
    admin-dashboard.template.ts
    admin-settings.template.ts
```

模板通常导出两类东西：

- `renderXxxPage(data): string`：返回完整页面 HTML。
- `XxxPageData` / component data type：描述 server 需要传入的数据结构。

server route 负责准备数据，template 只负责把数据变成 HTML。

## layouts 是怎么用的

页面模板通常不会自己写完整 HTML shell，而是把页面主体内容交给 layout。

例如页面模板会构造 `pageContent`，然后调用：

```ts
renderAdminLayoutCatalyst({
  title,
  currentPath,
  user,
  content: pageContent
})
```

layout 负责统一输出后台导航、侧边栏、主题结构、全局脚本和页面容器。

当前有两套 layout：

- `admin-layout-v2.template.ts`：较早的一套后台布局。
- `admin-layout-catalyst.template.ts`：较新的 Catalyst 风格布局。

这也是为什么不同页面看起来可能不是完全同一套设计系统。

## 编辑器代码怎么接入

富文本编辑器目前放在：

```txt
packages/admin/src/plugins/
  tinymce-plugin.ts
  easy-mdx.ts
  core-plugins/quill-editor/index.ts
```

这些文件并不是完整的 server 插件实现。它们当前主要做两件事：

- 返回编辑器所需的 CDN `<script>` / `<link>`。
- 返回初始化编辑器的 inline script。

内容编辑页会根据 server 传入的插件状态决定是否注入这些资源：

```ts
data.tinymceEnabled ? getTinyMCEScript(...) : '<!-- TinyMCE plugin not active -->'
data.quillEnabled ? getQuillCDN(...) : '<!-- Quill plugin not active -->'
data.mdxeditorEnabled ? getMDXEditorScripts() : '<!-- MDXEditor plugin not active -->'
```

插件是否启用由 server 判断。例如 `admin-content.ts` 会调用插件服务或中间件检查：

```ts
const tinymceEnabled = await isPluginActive(db, 'tinymce-plugin')
const quillEnabled = await isPluginActive(db, 'quill-editor')
const mdxeditorEnabled = await isPluginActive(db, 'easy-mdx')
```

因此编辑器的运行链路是：

```txt
server 检查插件状态
  -> server 读取插件 settings
  -> server 把 enabled/settings 放进 ContentFormData
  -> admin template 注入对应 CDN 和初始化脚本
  -> 浏览器加载编辑器
```

后续如果要把编辑器抽成独立 package，可以把这些 helper 移到类似 `@worker-blog/editors` 的包中，让 admin template 从该包导入。

## services 目录如何处理

`packages/admin/src/services` 曾经包含：

- `auth-validation.ts`
- `route-metadata.ts`

这些文件来自 admin/server/shared 拆分过程中的中间状态，目前已经按边界拆出：

其中一部分内容是 UI 或类型确实需要的，比如：

- auth settings 的类型。
- API reference 页面需要的 route category metadata。

这些纯类型、Zod schema 和 metadata 已移动到 `@worker-blog/shared`。

但另一部分内容更偏 server runtime，比如：

- 访问 D1 数据库检查注册开关。
- 通过 Hono `inspectRoutes()` 自动发现路由。
- 保存 app instance。

这些 runtime 逻辑保留在 `packages/server/src/services`。

当前边界是：

- 纯类型、Zod schema、metadata 放到 `shared`。
- Hono app、D1 查询、缓存等 runtime 逻辑留在 `server`。
- admin template 只从 `shared` 导入展示所需的类型和常量。

## db 目录为什么存在

`packages/admin/src/db/schema.ts` 当前只是：

```ts
export * from '../../../server/src/db/schema'
```

这是一个迁移期兼容层，让 admin 里的模板可以拿到 server schema 中的类型。

这个方向并不理想，因为它让 `admin` 反向依赖 `server`。例如模板如果只需要 `LogConfig` 类型，更好的做法是把轻量类型抽到 `shared`，而不是让 admin import server 的 Drizzle schema。

后续目标应该是删除 admin 的 `db` 目录。

## 开发时怎么验证

常用验证命令：

```sh
pnpm type-check
pnpm --filter @worker-blog/server test
```

如果只改 admin template，重点看：

- TypeScript 是否通过。
- server route 传入的 `PageData` 是否和 template 类型一致。
- `/admin/*` 页面是否仍能正常渲染。
- 内容编辑页的 TinyMCE、Quill、EasyMDE 资源是否按插件状态注入。

## 当前边界总结

一句话总结：

`@worker-blog/admin` 当前是 server 使用的后台 HTML 渲染包；它自己不运行服务，不直接连数据库，主要通过 `@worker-blog/admin/templates/...` 暴露页面、布局和组件模板。`services`、`db`、`plugins` 目录里有一部分是迁移期遗留或 UI helper，后续可以继续拆到 `shared` 或独立 editor package 中。
