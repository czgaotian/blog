# Admin React Migration Plan

本文规划如何把 `@worker-blog/admin` 从当前的 `hono/html` 字符串模板，渐进迁移到 React/TSX。

目标不是立刻把后台改成完整 SPA，而是在保持现有 server 路由、鉴权、数据库访问方式不变的前提下，先把 admin 的 UI 编写方式现代化。

## 当前状态

admin 当前是 server 使用的 UI 渲染包：

```txt
server route
  -> 查询数据库、检查权限、读取插件状态
  -> 整理 PageData
  -> 调用 @worker-blog/admin/templates/... 的 render 函数
  -> c.html(renderedHtml)
```

admin template 主要使用 `hono/html` 和字符串拼接返回 HTML。这个方案轻量、依赖少，但随着页面、表单、表格、编辑器和插件配置页变多，维护成本会越来越高。

已经整理好的包边界应继续保持：

```txt
server -> admin
server -> shared
admin  -> shared
```

- `server` 继续负责 Hono routes、鉴权、数据库、插件服务、Worker bindings。
- `admin` 负责 UI 组件、页面结构、布局和浏览器侧资源。
- `shared` 负责跨包类型、Zod schema、纯工具函数和通用契约。

## 推荐目标

推荐采用 React SSR + 局部 hydrate 的渐进方案：

```txt
server route
  -> 准备 PageData
  -> 调用 admin render 函数
  -> admin 内部使用 React renderToString/renderToStaticMarkup
  -> c.html(renderedHtml)
```

也就是说，外部调用方式先不变：

```ts
return c.html(renderContentFormPage(formData))
```

但 admin 内部从字符串模板逐步变成：

```tsx
export function renderContentFormPage(data: ContentFormData) {
  return renderAdminPage(<ContentFormPage data={data} />)
}
```

这样可以先获得 TSX、组件 props、IDE 支持、格式化和更好的组件组合能力，同时避免一次性重写 server API 和前端路由。

## 不建议一开始做的事

暂时不建议直接把 admin 改成完整 React SPA：

- 需要为所有后台页面补齐 JSON API。
- 需要重新设计前端路由、鉴权状态、权限错误、CSRF、表单提交、文件上传和重定向。
- 需要引入 Vite 构建、静态资源部署、路由 fallback、缓存策略。
- 现有 Hono route 已经承担了大量页面级数据整理，直接 SPA 化会产生较大重写成本。

SPA 可以作为长期方向，但不适合作为第一阶段。

## Phase 1: React SSR 基础设施

目标：让 admin 包可以渲染 React 组件，但不迁移业务页面。

计划：

- 给 `@worker-blog/admin` 增加 `react`、`react-dom` 依赖。
- 给 admin tsconfig 开启 JSX，例如 `jsx: "react-jsx"`。
- 新增 React 渲染 helper，例如：

```txt
packages/admin/src/react/
  render.tsx
  html.ts
```

建议 helper 负责：

- 调用 `renderToStaticMarkup` 或 `renderToString`。
- 统一处理 `<!doctype html>` 是否由 layout 输出。
- 提供 HTML 转义边界，避免把不可信字符串直接拼进 raw HTML。
- 保留现有 render 函数返回 `string` 的约定。

验收标准：

- `pnpm type-check` 通过。
- 不迁移任何页面时，现有 admin 页面行为不变。
- 可以新增一个最小 React demo component，并在测试或临时页面里成功 render 为 HTML 字符串。

## Phase 2: 迁移基础组件

目标：先迁移低风险、复用高的组件，不碰复杂页面逻辑。

优先候选：

- alert
- confirmation dialog
- pagination
- table
- logo
- auth settings form 中可独立拆出的字段组件

迁移方式：

- 每个旧模板保留原来的 public export。
- 内部改为调用 React 组件渲染。
- 如果 server 或其他模板依赖旧函数签名，不改签名。

示例：

```tsx
export function renderAlert(data: AlertData) {
  return renderFragment(<Alert {...data} />)
}
```

验收标准：

- 旧 import 路径仍可用。
- 页面 HTML 结构和 class 尽量保持一致。
- `pnpm type-check` 通过。
- 至少手动检查一个使用该组件的 admin 页面。

## Phase 3: 迁移布局

目标：把 `admin-layout-v2` 和 `admin-layout-catalyst` 迁移到 React。

布局是页面迁移的关键，因为大部分页面都把内容交给 layout 包装。

计划：

- 先迁移较新的 `admin-layout-catalyst`。
- 保留旧的 `renderAdminLayoutCatalyst(data)` 函数。
- 允许 `content` 在迁移期同时支持 `string` 和 React node。
- 新页面优先传 React node，旧页面继续传 string。

迁移期类型可以类似：

```ts
type AdminLayoutContent = string | React.ReactNode
```

注意事项：

- 旧字符串内容必须明确经过可信边界处理。
- 不要让 layout 无意 escape 已经渲染好的旧 HTML。
- 全局脚本、样式、导航、主题切换、用户菜单先保持行为一致。

验收标准：

- 使用 Catalyst layout 的旧页面仍可渲染。
- 一个 React 页面可以通过 React layout 完整输出。
- 全局 admin 导航、暗色模式、页面 title 不回退。

## Phase 4: 迁移简单页面

目标：迁移展示为主、交互较少的页面，验证页面级写法。

优先候选：

- dashboard
- api reference
- logs list
- log config
- plugin list
- settings 中的静态区块

页面迁移规则：

- 保留 `renderXxxPage(data): string`。
- `XxxPageData` 类型继续作为 server/admin 的契约。
- 如果类型被多个包共享，放到 `@worker-blog/shared`。
- 页面内不要直接访问数据库、Hono context 或 server service。

验收标准：

- route 无需改或只做最小 import 调整。
- 页面截图和主要功能与迁移前一致。
- `pnpm type-check` 通过。

## Phase 5: 迁移复杂表单和编辑器页面

目标：处理内容编辑、媒体库、forms builder、富文本编辑器等复杂页面。

这些页面应最后迁移，因为它们包含更多浏览器侧脚本和第三方编辑器初始化。

重点页面：

- content form
- media library
- forms builder
- collections form
- TinyMCE / Quill / EasyMDE 相关编辑器注入

计划：

- 先把静态页面结构迁移到 React。
- 保留现有编辑器 CDN helper 和初始化脚本。
- 再考虑把编辑器封装为 React component 或独立 package。
- 对需要交互状态的区域引入局部 hydrate。

注意事项：

- 不要在第一轮迁移中重写编辑器核心逻辑。
- 不要让 React 接管第三方编辑器已经直接操作的 DOM，除非明确隔离容器。
- 表单提交可以先继续使用普通 POST 或 HTMX。

验收标准：

- 编辑器能正常加载、初始化、提交内容。
- 表单错误和成功反馈不回退。
- 文件上传、媒体选择、动态字段行为不回退。

## Phase 6: 局部 Hydration

目标：只给需要浏览器状态的组件加客户端 React。

适合 hydrate 的区域：

- modal / dialog
- tabs
- sortable list
- media picker
- rich text editor wrapper
- complex filter bar
- forms builder 子区域

不需要 hydrate 的区域：

- 纯展示表格
- 静态详情页
- 简单表单
- server 已经能处理的分页和过滤

建议做法：

- 使用 islands 思路，为每个可交互组件输出一个明确 root。
- 由 server HTML 传入初始 props。
- 客户端 bundle 只 hydrate 对应组件。

示意：

```html
<div data-admin-island="media-picker" data-props="..."></div>
<script type="module" src="/admin/assets/media-picker.js"></script>
```

验收标准：

- 未 hydrate 的页面不加载无关 JS。
- 交互组件可以独立打包、独立初始化。
- 页面在 JS 加载失败时仍有可接受的降级体验。

## Phase 7: 可选 SPA 化

只有当 admin 的交互复杂度继续上升时，再考虑完整 SPA。

触发条件：

- 大部分页面都需要客户端状态。
- 页面间跳转需要保持复杂状态。
- 后台 API 已经稳定且覆盖完整 CRUD。
- 构建和部署静态资源的成本可以接受。

到这个阶段可以评估：

- Vite + React Router
- TanStack Router
- TanStack Query
- 独立 admin asset pipeline

这应作为长期演进，而不是当前迁移的第一步。

## 文件组织建议

迁移期可以采用并行结构：

```txt
packages/admin/src/
  react/
    render.tsx
    islands.ts
  templates/
    components/
      alert.template.ts
      alert.tsx
    layouts/
      admin-layout-catalyst.template.ts
      admin-layout-catalyst.tsx
    pages/
      admin-log-config.template.ts
      admin-log-config.tsx
```

约定：

- `.template.ts` 保持对外兼容的 render 函数。
- `.tsx` 放 React component。
- 迁移完成后，可以再决定是否移除 `.template.ts` 后缀。

## 类型边界

页面数据类型应继续遵守这些规则：

- 只被 admin 页面使用的 `PageData` 可以留在 admin。
- server 和 admin 都需要理解的轻量契约放到 `shared`。
- Drizzle schema、数据库 insert/select 类型留在 server。
- admin 不 import `server/src/db/schema`。
- admin 不 import `server/src/services`。

## 风险

主要风险：

- React SSR 和旧 HTML string 混用时，可能出现转义或重复 escape。
- 第三方编辑器直接操作 DOM，和 React 管理 DOM 的边界需要隔离。
- 一次迁移太多页面会让视觉回归难以定位。
- 如果过早 SPA 化，会把 server route 中已有的数据整理逻辑推倒重写。

控制方式：

- 每次只迁移一个组件或一个页面。
- 保留旧 render 函数签名。
- 页面迁移前后对比 HTML 结构和关键交互。
- 对复杂页面先迁移外壳，再迁移交互。

## 验证清单

每个迁移 PR 至少验证：

```sh
pnpm type-check
```

页面级迁移还应手动检查：

- 页面能正常打开。
- 导航和 layout 正常。
- 表单提交正常。
- HTMX 行为正常。
- 插件启用/禁用状态正常。
- 编辑器资源按预期加载。

复杂交互页面建议补充浏览器截图或 Playwright 检查。

## 推荐第一步

建议先迁移 `admin-log-config` 页面，因为它：

- 数据结构简单。
- 已经只依赖 `@worker-blog/shared/types` 的 `LogConfig`。
- 没有富文本编辑器或复杂客户端状态。
- 可以验证 React SSR、layout 兼容和表单输出。

第一步完成后，再迁移 pagination/table/alert 这类基础组件，逐步吃掉字符串模板。
