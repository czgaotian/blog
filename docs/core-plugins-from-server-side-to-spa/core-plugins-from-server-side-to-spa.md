# Core Plugins 拆解重构计划：从 Server-Side 渲染迁移到 SPA + API 架构

## 目标概述

将 6 个 Core Plugins 从**服务端渲染HTML** (基于templates) 迁移到**现代SPA架构**：
- 前端: React SPA 页面 (`/packages/admin/src/spa/pages/`)
- 后端: REST API 接口 (`/packages/server/src/routes/` 或 plugin 独立 API)
- 移除: 所有 HTML 模板渲染依赖

**核心好处**:
- ✅ 移除 templates 依赖，彻底解决循环依赖
- ✅ 统一架构 (SPA + API 而非混合的服务端渲染)
- ✅ 提升用户体验 (交互式、无页面刷新)
- ✅ 易于维护和扩展

---

## 受影响的 Core Plugins

| # | Plugin | 当前架构 | 重构范围 | 优先级 |
|---|--------|---------|---------|--------|
| 1 | **AI-Search** | 服务端渲染 settings-page | API + React SPA | P0 |
| 2 | **Stripe** | 服务端渲染 events-page、subscriptions | API + React SPA | P0 |
| 3 | **Security-Audit** | 服务端渲染 dashboard、event-log、settings | API + React SPA | P1 |
| 4 | **Analytics** | 服务端渲染 admin 页面 | API + React SPA | P1 |
| 5 | **Workflow** | 服务端渲染 3 个页面 | API + React SPA | P1 |
| 6 | **User-Profiles** | 服务端渲染 profile 页面 | API + React SPA | P2 |

---

## 重构架构设计

### 当前架构 (要移除)
```
Plugin Admin Route (GET)
  ├─ 调用 Service 获取数据
  ├─ renderAdminLayout + HTML 字符串拼接
  └─ 返回 HTML 字符串给浏览器
```

### 目标架构 (迁移目标)
```
┌─ 前端 (SPA)                          ┌─ 后端 (API)
│ /spa/pages/ai-search.tsx             │ /api/plugins/ai-search/settings
│ ├─ useAISearchSettings()             │ ├─ GET /settings
│ ├─ useAISearchIndexStatus()          │ ├─ POST /index
│ └─ 纯 React 组件                     │ └─ DELETE /index/{id}
│
└─ useQuery(queryKey, API endpoint)───→ plugin API 路由
                                       └─ 返回 JSON 数据
```

---

## 分阶段实施计划

### Phase 1: 架构准备
**目标**: 建立标准化的迁移模板和工具链

#### 1.1 创建 API 标准化层
- [ ] 设计统一的 API 响应格式: `{ success: boolean; data?: T; error?: string }`
- [ ] 创建共享类型定义 (`@worker-blog/shared/admin-api`)
- [ ] 建立 API 路由标准: `/api/plugins/{plugin-name}/{resource}`

#### 1.2 创建 SPA 组件模板库
- [ ] Table、Form、Layout、Alert 等可复用组件
- [ ] React Hook 模式: usePluginData、usePluginMutation
- [ ] 页面模板: Settings、Dashboard、List

#### 1.3 创建类型定义包
- [ ] 在 `/packages/shared/src/admin-api.ts` 定义所有 plugin 类型

---

### Phase 2: AI-Search Plugin 重构 (P0)
**目标**: 完成第一个 plugin 的完整迁移

#### 2.1 后端 API 改造
- [ ] 新增管理 API: /api/plugins/ai-search/{settings|collections|index|status}
- [ ] 定义响应类型

#### 2.2 前端 React 页面迁移
- [ ] `/packages/admin/src/spa/pages/ai-search-settings.tsx`
- [ ] Hooks: useAISearchSettings、useAISearchIndexStatus、useAISearchCollections
- [ ] 集成到 router

#### 2.3 删除服务端渲染
- [ ] 删除 `components/settings-page.ts`
- [ ] 移除 renderSettingsPage 调用

#### 2.4 验证
- [ ] npm run build ✓
- [ ] npm run type-check ✓
- [ ] 功能测试通过 ✓

---

### Phase 3: Stripe Plugin 重构 (P0)
**目标**: 迁移第二个 core plugin

#### 3.1 后端 API 改造
- [ ] `/api/plugins/stripe/{events|subscriptions|stats|sync}`

#### 3.2 前端迁移
- [ ] `/packages/admin/src/spa/pages/stripe.tsx`
- [ ] Hooks: useStripeEvents、useStripeSubscriptions、useStripeStats
- [ ] Tab 导航: Events、Subscriptions、Stats

#### 3.3 删除服务端渲染
- [ ] 删除 components/events-page.ts、subscriptions-page.ts、tab-bar.ts

---

### Phase 4: Security-Audit Plugin 重构 (P1)

#### 4.1 后端 API
- [ ] `/api/plugins/security-audit/{dashboard|events|settings|alerts}`

#### 4.2 前端迁移
- [ ] `/packages/admin/src/spa/pages/security-audit.tsx`
- [ ] Tab 导航: Dashboard、Events、Settings、Alerts

---

### Phase 5: Analytics Plugin 重构 (P1)
- [ ] `/packages/admin/src/spa/pages/analytics.tsx`
- [ ] API: `/api/plugins/analytics/*`
- [ ] Hooks: useAnalyticsData、useAnalyticsCharts

---

### Phase 6: Workflow Plugin 重构 (P1)
**目标**: 处理 3 个页面的 workflow plugin

#### 6.1 后端 API
- [ ] `/api/plugins/workflow/{dashboard|content|scheduled}`

#### 6.2 前端迁移
- [ ] `/packages/admin/src/spa/pages/workflow-dashboard.tsx`
- [ ] `/packages/admin/src/spa/pages/workflow-content.tsx`
- [ ] `/packages/admin/src/spa/pages/workflow-scheduled.tsx`

---

### Phase 7: User-Profiles Plugin 重构 (P2 - 可选)

---

### Phase 8: 最终清理 (验收)
**目标**: 确保完整迁移

#### 8.1 删除 Templates 依赖
- [ ] 从 `/packages/admin/src/index.ts` 删除 `export * from './templates'`
- [ ] 删除 `/packages/admin/src/templates` 整个目录
- [ ] 验证无编译错误

#### 8.2 最终验证
- [ ] npm run build ✓
- [ ] npm run type-check ✓
- [ ] npm run lint ✓
- [ ] 所有 plugin admin 功能通过 SPA 工作正常

---

## 文件变更清单

### 删除
```
packages/admin/src/templates/                     (整个目录)
packages/server/src/plugins/core-plugins/*/components/*-page.ts
packages/server/src/plugins/core-plugins/*/components/tab-bar.ts
```

### 创建
```
packages/admin/src/spa/pages/
  ├─ ai-search-settings.tsx
  ├─ stripe.tsx
  ├─ security-audit.tsx
  ├─ analytics.tsx
  ├─ workflow-dashboard.tsx
  ├─ workflow-content.tsx
  ├─ workflow-scheduled.tsx
  └─ user-profile.tsx

packages/admin/src/spa/api/
  ├─ ai-search.ts
  ├─ stripe.ts
  ├─ security-audit.ts
  ├─ analytics.ts
  ├─ workflow.ts
  └─ user-profile.ts

packages/shared/src/admin-api.ts  (共享类型定义)
```

### 修改
```
packages/server/src/plugins/core-plugins/*/routes/api.ts
packages/admin/src/spa/router.tsx
packages/admin/src/spa/app.tsx
packages/admin/src/index.ts
```

---

## 工作量估计

| Phase | Task | 估计工作量 |
|-------|------|----------|
| 1 | 架构准备 & 类型定义 | 2-3 天 |
| 2 | AI-Search 重构 (完整模板) | 2-3 天 |
| 3 | Stripe 重构 (类似模板) | 1-2 天 |
| 4 | Security-Audit 重构 | 2-3 天 |
| 5 | Analytics 重构 | 1-2 天 |
| 6 | Workflow 重构 (3 页面) | 2-3 天 |
| 7 | User-Profiles 重构 | 1 天 |
| 8 | 最终清理 & 验证 | 1 天 |
| **总计** | | **12-17 天** |

---

## 风险管理

### 降低风险策略
1. **增量迁移**: 每个 plugin 独立完成
2. **保留兼容性**: 迁移中保留旧 API 一段时间
3. **充分测试**: 每个阶段完成后运行完整测试
4. **Git 策略**: 每个 plugin 一个 feature branch，小的 commit

### 回滚计划
- 创建 Git tag: `v-before-templates-removal`
- 如需回滚，恢复到该 tag 并调查问题

---

## 成功指标

- ✅ 所有 6 个 core plugins 通过 SPA 完整工作
- ✅ 无编译错误，类型检查通过
- ✅ templates 目录完全删除
- ✅ 用户体验改进 (交互更流畅)
