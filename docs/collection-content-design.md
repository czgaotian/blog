# Collection 与 Content 设计说明

## 背景

本项目使用轻量 CMS 模型来管理内容。`collections` 负责定义内容类型，`content` 负责保存具体内容项。

可以把它理解为：

- `collection`：内容结构定义，例如博客文章、产品、页面。
- `content`：某个 collection 下的一条具体内容。

例如可以创建这些 collection：

| Collection | 含义 | 可能字段 |
| --- | --- | --- |
| `blog_posts` | 博客文章 | `excerpt`、`body`、`cover_image`、`published_at` |
| `products` | 产品数据 | `price`、`sku`、`stock`、`images` |
| `pages` | 普通页面 | `body`、`seo_title`、`seo_description` |

这些名称不是系统保留关键字，只是业务上可以创建的内容类型。

## 数据模型

`collections` 表保存内容类型定义：

| 字段 | 作用 |
| --- | --- |
| `id` | collection 唯一 ID |
| `name` | 程序使用的名称，只允许小写字母、数字和下划线 |
| `display_name` | 管理后台显示名称 |
| `description` | 描述 |
| `schema` | 内容字段结构定义，JSON 字符串 |
| `is_active` | 是否启用 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

`content` 表保存具体内容项：

| 字段 | 作用 |
| --- | --- |
| `id` | content 唯一 ID |
| `collection_id` | 所属 collection，引用 `collections.id` |
| `slug` | URL/唯一标识用的短路径 |
| `title` | 内容标题 |
| `data` | 自定义字段 JSON |
| `status` | 内容状态，例如 `draft`、`published`、`archived` |
| `published_at` | 发布时间 |
| `author_id` | 作者用户 ID，引用 `users.id` |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |
| `deleted_at` | 软删除时间 |

表关系是：

```txt
collections.id
  ↓
content.collection_id
```

## 自定义字段如何保存

`content` 表不会因为不同 collection 动态增加数据库列。所有 collection 共享同一张 `content` 表，自定义字段保存在 `content.data` 这个 JSON 字段里。

例如 `blog_posts` 定义了：

```txt
excerpt
body
cover_image
```

对应的一条 content 可以保存为：

```json
{
  "id": "content_1",
  "collection_id": "blog_posts 对应的 collection id",
  "title": "Hello World",
  "slug": "hello-world",
  "status": "draft",
  "data": {
    "excerpt": "Short intro",
    "body": "Article body",
    "cover_image": "media_123"
  }
}
```

如果 `products` 定义了：

```txt
price
sku
stock
```

另一条 content 可以保存为：

```json
{
  "id": "content_2",
  "collection_id": "products 对应的 collection id",
  "title": "Keyboard",
  "slug": "keyboard",
  "status": "published",
  "data": {
    "price": 99,
    "sku": "KB-001",
    "stock": 20
  }
}
```

因此，系统支持自定义 collection key 的方式是：

```txt
固定 content 表结构 + content.data JSON + collections.schema 校验
```

字段定义只存在 `collections.schema`。系统不再维护单独的字段表，也不会从其他表回退读取字段定义。

`required` 和 `searchable` 的存储方式如下：

```json
{
  "type": "object",
  "properties": {
    "body": {
      "type": "string",
      "title": "Body",
      "format": "markdown",
      "searchable": true
    }
  },
  "required": ["body"]
}
```

- `required`：字段名存在于 `schema.required` 数组中。
- `searchable`：字段配置中的 `schema.properties[fieldName].searchable`。

## 创建 Content 的流程

创建 content 时，调用方需要传入：

```json
{
  "collectionId": "collection id",
  "title": "我的第一篇文章",
  "slug": "my-first-post",
  "status": "draft",
  "data": {
    "body": "文章内容"
  }
}
```

后端流程：

1. 根据 `collectionId` 查询启用中的 collection。
2. 读取 `collections.schema`。
3. 使用 schema 校验 `data`：
   - 是否包含未知字段。
   - required 字段是否缺失。
   - 字段类型是否正确。
4. 校验通过后写入 `content` 表。
5. 管理后台创建内容时，同时写入 `content_versions` 作为初始版本。
6. 更新内容时，如果 `data` 变化，也会写入新的 content version。

查询 content 列表时，后端会 join collection：

```sql
FROM content c
JOIN collections col ON c.collection_id = col.id
```

所以列表能显示每条内容属于哪个 collection。

## 字段类型

当前 shared contract 支持的 collection field type 包括：

```txt
text
slug
number
boolean
date
select
radio
media
reference
richtext
quill
markdown
```

这些字段类型用于描述管理后台应该如何输入内容，以及后端应该如何校验 `content.data`。

## 字段定义来源

字段定义的唯一来源是 `collections.schema`：

```txt
collections.schema.properties 定义字段
collections.schema.required 定义必填字段
collections.schema.properties[fieldName].searchable 定义是否可搜索
```

项目不再使用独立的字段表保存 collection 字段。所有字段增删改都会直接更新 `collections.schema`。

## 当前实现状态

后端已经支持 collection 与 content 的核心关系：

- `POST /api/admin/collections` 创建 collection。
- `POST /api/admin/collections/:id/fields` 添加字段。
- `POST /api/admin/content` 创建 content。
- `PUT /api/admin/content/:id` 更新 content。
- `GET /api/admin/content` 查询 content 列表。
- `GET /api/admin/content/:id` 查询 content 详情，并返回所属 collection 的字段。

前端 admin 当前已经有：

- collection 列表页面。
- collection 创建/编辑页面。
- content 列表页面。
- content API hooks，例如 `useCreateContent()`、`useUpdateContent()`。

但当前前端路由中还没有完整的 content 创建/编辑页面入口，例如：

```txt
/content/new
/content/:id/edit
```

也就是说，后端 API 层已经可以在某个 collection 下创建 content，但管理后台 UI 还缺少“选择 collection，然后根据字段动态渲染表单并提交 content”的完整流程。

## 后续建议

为了让 collection 真正在 content 管理里可用，建议补齐前端内容创建/编辑流程：

1. 在 Content 页面添加 `New content` 按钮。
2. 新增创建页面，先选择 collection。
3. 根据 collection fields 动态渲染表单。
4. 提交时把固定字段放到 `title`、`slug`、`status`，把自定义字段组装到 `data`。
5. 新增编辑页面，读取 content 详情中的 `fields` 和 `data` 回填表单。
6. 保持后端作为最终校验来源，前端校验只做用户体验辅助。
