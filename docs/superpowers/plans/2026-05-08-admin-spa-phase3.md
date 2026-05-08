# Admin SPA Phase 3 — Low-Risk Page Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate 6 read-only admin pages (dashboard, logs list/details/config, api-reference, plugins list) from legacy Hono HTML templates to React SPA + JSON API endpoints.

**Architecture:** Add dedicated server API files per feature area (`admin-api-dashboard.ts`, `admin-api-logs.ts`, `admin-api-plugins.ts`, `admin-api-routes.ts`) mounted under `/admin/api/`. Add shared response types in `packages/shared/src/admin-api/`. Add React pages in `packages/admin/src/spa/pages/` with React Query hooks. Legacy HTML routes stay untouched.

**Tech Stack:** Hono, Cloudflare Workers D1, Vitest (server tests), React, @tanstack/react-query, TypeScript, Tailwind CSS.

---

## File Map

**Create:**
- `packages/shared/src/admin-api/dashboard.ts`
- `packages/shared/src/admin-api/logs.ts`
- `packages/shared/src/admin-api/plugins.ts`
- `packages/shared/src/admin-api/routes.ts`
- `packages/server/src/routes/admin-api-dashboard.ts`
- `packages/server/src/routes/admin-api-dashboard.test.ts`
- `packages/server/src/routes/admin-api-logs.ts`
- `packages/server/src/routes/admin-api-logs.test.ts`
- `packages/server/src/routes/admin-api-plugins.ts`
- `packages/server/src/routes/admin-api-plugins.test.ts`
- `packages/server/src/routes/admin-api-routes.ts`
- `packages/server/src/routes/admin-api-routes.test.ts`
- `packages/admin/src/spa/api/dashboard.ts`
- `packages/admin/src/spa/api/logs.ts`
- `packages/admin/src/spa/api/plugins.ts`
- `packages/admin/src/spa/api/routes.ts`
- `packages/admin/src/spa/pages/dashboard.tsx`
- `packages/admin/src/spa/pages/logs-list.tsx`
- `packages/admin/src/spa/pages/log-details.tsx`
- `packages/admin/src/spa/pages/log-config.tsx`
- `packages/admin/src/spa/pages/api-reference.tsx`
- `packages/admin/src/spa/pages/plugins-list.tsx`

**Modify:**
- `packages/shared/src/admin-api/index.ts` — re-export new types
- `packages/server/src/routes/admin-api.ts` — mount new sub-routers
- `packages/admin/src/spa/router.tsx` — add 6 new routes
- `packages/admin/src/spa/layouts/admin-layout.tsx` — remove `legacy: true` flags from migrated nav items

---

## Task 1: Shared types — dashboard

**Files:**
- Create: `packages/shared/src/admin-api/dashboard.ts`
- Modify: `packages/shared/src/admin-api/index.ts`

- [ ] **Step 1: Create dashboard types**

Create `packages/shared/src/admin-api/dashboard.ts`:

```typescript
export interface DashboardStats {
  collections: number
  contentItems: number
  mediaFiles: number
  users: number
  mediaSize: number
  databaseSize: number
}

export interface DashboardActivityItem {
  id: string
  type: string
  action: string
  description: string
  timestamp: string
  user: string
}

export interface DashboardMetrics {
  requestsPerSecond: number
  totalRequests: number
  averageRPS: number
  timestamp: string
}

export interface DashboardResponse {
  stats: DashboardStats
  recentActivity: DashboardActivityItem[]
  metrics: DashboardMetrics
}
```

- [ ] **Step 2: Export dashboard from shared index**

Edit `packages/shared/src/admin-api/index.ts` — add the dashboard export (leave `auth` export intact, do NOT add logs/plugins/routes yet — those files don't exist until Task 2):

```typescript
export * from './auth'
export * from './dashboard'
```

---

## Task 2: Shared types — logs, plugins, routes

**Files:**
- Create: `packages/shared/src/admin-api/logs.ts`
- Create: `packages/shared/src/admin-api/plugins.ts`
- Create: `packages/shared/src/admin-api/routes.ts`

- [ ] **Step 1: Create logs types**

Create `packages/shared/src/admin-api/logs.ts`:

```typescript
export interface LogEntryResponse {
  id: string
  level: string
  category: string
  message: string
  source: string | null
  userId: string | null
  ipAddress: string | null
  method: string | null
  url: string | null
  statusCode: number | null
  duration: number | null
  data: unknown | null
  tags: string[]
  createdAt: string
}

export interface LogPagination {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

export interface LogFilters {
  level: string
  category: string
  search: string
  startDate: string
  endDate: string
  source: string
}

export interface LogsListResponse {
  logs: LogEntryResponse[]
  pagination: LogPagination
  filters: LogFilters
}

export interface LogDetailsResponse {
  log: LogEntryResponse
}

export interface LogConfigEntry {
  id: string
  category: string
  enabled: boolean
  level: string
  retention: number
  maxSize: number | null
}

export interface LogConfigResponse {
  configs: LogConfigEntry[]
}
```

- [ ] **Step 2: Create plugins types**

Create `packages/shared/src/admin-api/plugins.ts`:

```typescript
export type PluginStatus = 'active' | 'inactive' | 'error' | 'uninstalled'

export interface PluginListItem {
  id: string
  name: string
  displayName: string
  description: string
  version: string
  author: string
  status: PluginStatus
  category: string
  icon: string
  lastUpdated: string
  isCore: boolean
  dependencies: string[]
  permissions: string[]
}

export interface PluginsStats {
  total: number
  active: number
  inactive: number
  errors: number
  uninstalled: number
}

export interface PluginsListResponse {
  plugins: PluginListItem[]
  stats: PluginsStats
}
```

- [ ] **Step 3: Create routes types**

Create `packages/shared/src/admin-api/routes.ts`:

```typescript
import type { RouteMetadata } from '@worker-blog/shared/routes'

export interface ApiReferenceResponse {
  endpoints: RouteMetadata[]
  version: string
}
```

- [ ] **Step 4: Update shared index to export all types**

Edit `packages/shared/src/admin-api/index.ts` — replace the entire file:

```typescript
export * from './auth'
export * from './dashboard'
export * from './logs'
export * from './plugins'
export * from './routes'
```

---

## Task 3: Server API — dashboard endpoint

**Files:**
- Create: `packages/server/src/routes/admin-api-dashboard.ts`
- Create: `packages/server/src/routes/admin-api-dashboard.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/server/src/routes/admin-api-dashboard.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

vi.mock('@worker-blog/shared/utils/metrics', () => ({
  metricsTracker: {
    getRequestsPerSecond: () => 1.5,
    getTotalRequests: () => 100,
    getAverageRPS: () => 1.2,
  },
}))

import { adminApiDashboardRoutes } from './admin-api-dashboard'

function createApp() {
  const app = new Hono()
  app.use('/admin/api/dashboard/*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'a@example.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/admin/api/dashboard', adminApiDashboardRoutes)
  return app
}

describe('GET /admin/api/dashboard', () => {
  it('returns 200 with stats, recentActivity, and metrics shapes', async () => {
    const db = {
      prepare: (sql: string) => ({
        first: async () => {
          if (sql.includes('collections')) return { count: 3 }
          if (sql.includes('content')) return { count: 7 }
          if (sql.includes('media')) return { count: 5, total_size: 1024 }
          if (sql.includes('users')) return { count: 2 }
          return null
        },
        run: async () => ({ meta: { size_after: 2048 } }),
        bind: (..._args: any[]) => ({
          all: async () => ({ results: [] }),
        }),
      }),
    }

    const app = createApp()
    const res = await app.request('/admin/api/dashboard', {}, { DB: db })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('stats')
    expect(json).toHaveProperty('recentActivity')
    expect(json).toHaveProperty('metrics')
    expect(json.metrics.requestsPerSecond).toBe(1.5)
    expect(json.metrics.totalRequests).toBe(100)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/admin/api/dashboard', adminApiDashboardRoutes)
    const res = await app.request('/admin/api/dashboard')
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /home/tian/Projects/blog && pnpm --filter @worker-blog/server test -- admin-api-dashboard
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement dashboard API route**

Create `packages/server/src/routes/admin-api-dashboard.ts`:

```typescript
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { metricsTracker } from '@worker-blog/shared/utils/metrics'
import type { DashboardResponse } from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiDashboardRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiDashboardRoutes.use('*', requireAuth())
adminApiDashboardRoutes.use('*', requireRole(['admin', 'editor']))

adminApiDashboardRoutes.get('/', async (c) => {
  const db = c.env.DB

  // Stats
  let collections = 0, contentItems = 0, mediaFiles = 0, mediaSize = 0, users = 0, databaseSize = 0
  try {
    const r = await db.prepare("SELECT COUNT(*) as count FROM collections WHERE is_active = 1 AND (source_type IS NULL OR source_type = 'user')").first()
    collections = (r as any)?.count || 0
  } catch {}
  try {
    const r = await db.prepare("SELECT COUNT(*) as count FROM content c JOIN collections col ON c.collection_id = col.id WHERE c.deleted_at IS NULL AND (col.source_type IS NULL OR col.source_type = 'user')").first()
    contentItems = (r as any)?.count || 0
  } catch {}
  try {
    const r = await db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM media WHERE deleted_at IS NULL').first()
    mediaFiles = (r as any)?.count || 0
    mediaSize = (r as any)?.total_size || 0
  } catch {}
  try {
    const r = await db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').first()
    users = (r as any)?.count || 0
  } catch {}
  try {
    const r = await db.prepare('SELECT 1').run()
    databaseSize = (r as any)?.meta?.size_after || 0
  } catch {}

  // Recent activity
  let recentActivity: DashboardResponse['recentActivity'] = []
  try {
    const { results } = await db.prepare(`
      SELECT a.id, a.action, a.resource_type, a.created_at, u.email, u.first_name, u.last_name
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.resource_type IN ('content', 'collections', 'users', 'media')
      ORDER BY a.created_at DESC
      LIMIT 10
    `).bind().all()
    recentActivity = (results || []).map((row: any) => {
      const user = row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.email || 'System'
      const descriptions: Record<string, string> = { create: 'Created', update: 'Updated', delete: 'Deleted' }
      const verb = descriptions[row.action] || row.action
      return {
        id: row.id,
        type: row.resource_type,
        action: row.action,
        description: `${verb} ${row.resource_type}`,
        timestamp: new Date(Number(row.created_at)).toISOString(),
        user,
      }
    })
  } catch {}

  const response: DashboardResponse = {
    stats: { collections, contentItems, mediaFiles, users, mediaSize, databaseSize },
    recentActivity,
    metrics: {
      requestsPerSecond: metricsTracker.getRequestsPerSecond(),
      totalRequests: metricsTracker.getTotalRequests(),
      averageRPS: Number(metricsTracker.getAverageRPS().toFixed(2)),
      timestamp: new Date().toISOString(),
    },
  }

  return c.json(response)
})
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd /home/tian/Projects/blog && pnpm --filter @worker-blog/server test -- admin-api-dashboard
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Mount route in admin-api.ts**

Edit `packages/server/src/routes/admin-api.ts` — add after the existing imports:

```typescript
import { adminApiDashboardRoutes } from './admin-api-dashboard'
```

Add after the `/me` handler (before the `/stats` handler):

```typescript
adminApiRoutes.route('/dashboard', adminApiDashboardRoutes)
```

- [ ] **Step 6: Type-check**

```bash
cd /home/tian/Projects/blog && pnpm type-check
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /home/tian/Projects/blog && git add packages/shared/src/admin-api/ packages/server/src/routes/admin-api-dashboard.ts packages/server/src/routes/admin-api-dashboard.test.ts packages/server/src/routes/admin-api.ts && git commit -m "feat: add GET /admin/api/dashboard endpoint and shared types"
```

---

## Task 4: Server API — logs endpoints

**Files:**
- Create: `packages/server/src/routes/admin-api-logs.ts`
- Create: `packages/server/src/routes/admin-api-logs.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/server/src/routes/admin-api-logs.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

const mockLogs = [
  {
    id: 'log-1', level: 'info', category: 'api', message: 'Test log',
    source: null, userId: null, ipAddress: null, method: 'GET', url: '/test',
    statusCode: 200, duration: 50, data: null, tags: null,
    createdAt: new Date('2026-01-01'),
  },
]

vi.mock('../services', () => ({
  getLogger: () => ({
    getLogs: async () => ({ logs: mockLogs, total: 1 }),
    getAllConfigs: async () => [
      { id: 'c1', category: 'api', enabled: true, level: 'info', retention: 30, maxSize: 10000, createdAt: new Date(), updatedAt: new Date() },
    ],
  }),
}))

import { adminApiLogsRoutes } from './admin-api-logs'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'a@example.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/admin/api/logs', adminApiLogsRoutes)
  return app
}

describe('GET /admin/api/logs', () => {
  it('returns paginated logs list', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/logs')
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('logs')
    expect(json).toHaveProperty('pagination')
    expect(json).toHaveProperty('filters')
    expect(json.logs).toHaveLength(1)
    expect(json.pagination.totalItems).toBe(1)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/admin/api/logs', adminApiLogsRoutes)
    const res = await app.request('/admin/api/logs')
    expect(res.status).toBe(401)
  })
})

describe('GET /admin/api/logs/config', () => {
  it('returns log configs', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/logs/config')
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('configs')
    expect(json.configs[0].category).toBe('api')
  })
})

describe('GET /admin/api/logs/:id', () => {
  it('returns single log', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/logs/log-1')
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('log')
    expect(json.log.id).toBe('log-1')
  })

  it('returns 404 for unknown id', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/logs/not-found')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /home/tian/Projects/blog && pnpm --filter @worker-blog/server test -- admin-api-logs
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement logs API route**

Create `packages/server/src/routes/admin-api-logs.ts`:

```typescript
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { getLogger } from '../services'
import type { LogLevel, LogCategory, LogFilter } from '../services'
import type { LogsListResponse, LogDetailsResponse, LogConfigResponse, LogEntryResponse } from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiLogsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiLogsRoutes.use('*', requireAuth())
adminApiLogsRoutes.use('*', requireRole(['admin', 'editor']))

function toLogEntryResponse(log: any): LogEntryResponse {
  return {
    id: log.id,
    level: log.level,
    category: log.category,
    message: log.message,
    source: log.source ?? null,
    userId: log.userId ?? null,
    ipAddress: log.ipAddress ?? null,
    method: log.method ?? null,
    url: log.url ?? null,
    statusCode: log.statusCode ?? null,
    duration: log.duration ?? null,
    data: log.data ? (typeof log.data === 'string' ? JSON.parse(log.data) : log.data) : null,
    tags: log.tags ? (typeof log.tags === 'string' ? JSON.parse(log.tags) : log.tags) : [],
    createdAt: new Date(log.createdAt).toISOString(),
  }
}

// /config must be before /:id to avoid param capture
adminApiLogsRoutes.get('/config', async (c) => {
  const logger = getLogger(c.env.DB)
  const configs = await logger.getAllConfigs()
  const response: LogConfigResponse = {
    configs: configs.map(cfg => ({
      id: cfg.id,
      category: cfg.category,
      enabled: cfg.enabled,
      level: cfg.level,
      retention: cfg.retention,
      maxSize: cfg.maxSize ?? null,
    })),
  }
  return c.json(response)
})

adminApiLogsRoutes.get('/', async (c) => {
  const query = c.req.query()
  const page = Math.max(1, parseInt(query.page || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50')))
  const logger = getLogger(c.env.DB)

  const filter: LogFilter = {
    limit,
    offset: (page - 1) * limit,
    sortBy: 'created_at',
    sortOrder: 'desc',
  }
  if (query.level) filter.level = query.level.split(',') as LogLevel[]
  if (query.category) filter.category = query.category.split(',') as LogCategory[]
  if (query.search) filter.search = query.search
  if (query.source) filter.source = query.source
  if (query.start_date) filter.startDate = new Date(query.start_date)
  if (query.end_date) filter.endDate = new Date(query.end_date)

  const { logs, total } = await logger.getLogs(filter)
  const totalPages = Math.ceil(total / limit)

  const response: LogsListResponse = {
    logs: logs.map(toLogEntryResponse),
    pagination: { currentPage: page, totalPages, totalItems: total, itemsPerPage: limit },
    filters: {
      level: query.level || '',
      category: query.category || '',
      search: query.search || '',
      startDate: query.start_date || '',
      endDate: query.end_date || '',
      source: query.source || '',
    },
  }
  return c.json(response)
})

adminApiLogsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const logger = getLogger(c.env.DB)
  const { logs } = await logger.getLogs({ limit: 50, offset: 0 })
  const log = logs.find((l: any) => l.id === id)
  if (!log) return c.json({ error: 'Log not found' }, 404)
  const response: LogDetailsResponse = { log: toLogEntryResponse(log) }
  return c.json(response)
})
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /home/tian/Projects/blog && pnpm --filter @worker-blog/server test -- admin-api-logs
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Mount route in admin-api.ts**

Edit `packages/server/src/routes/admin-api.ts` — add import:

```typescript
import { adminApiLogsRoutes } from './admin-api-logs'
```

Add mount after the dashboard route line:

```typescript
adminApiRoutes.route('/logs', adminApiLogsRoutes)
```

- [ ] **Step 6: Type-check**

```bash
cd /home/tian/Projects/blog && pnpm type-check
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /home/tian/Projects/blog && git add packages/server/src/routes/admin-api-logs.ts packages/server/src/routes/admin-api-logs.test.ts packages/server/src/routes/admin-api.ts && git commit -m "feat: add GET /admin/api/logs, /logs/config, /logs/:id endpoints"
```

---

## Task 5: Server API — plugins list endpoint

**Files:**
- Create: `packages/server/src/routes/admin-api-plugins.ts`
- Create: `packages/server/src/routes/admin-api-plugins.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/server/src/routes/admin-api-plugins.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

vi.mock('../plugins/manifest-registry', () => ({
  PLUGIN_REGISTRY: {
    'rss-feed': {
      id: 'rss-feed', codeName: 'rss-feed', displayName: 'RSS Feed', description: 'RSS support',
      version: '1.0.0', author: 'core', category: 'content', iconEmoji: '📡',
      permissions: [], dependencies: [], is_core: false, defaultSettings: {},
    },
  },
  findPluginByCodeName: () => null,
}))

vi.mock('../services', () => ({
  PluginService: class {
    async getAllPlugins() { return [] }
    async getPluginStats() { return { total: 0, active: 0, inactive: 0, errors: 0, uninstalled: 0 } }
  },
}))

import { adminApiPluginsRoutes } from './admin-api-plugins'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'a@example.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/admin/api/plugins', adminApiPluginsRoutes)
  return app
}

describe('GET /admin/api/plugins', () => {
  it('returns plugins list and stats', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/plugins', {}, { DB: {} })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('plugins')
    expect(json).toHaveProperty('stats')
    expect(json.plugins).toHaveLength(1)
    expect(json.plugins[0].status).toBe('uninstalled')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/admin/api/plugins', adminApiPluginsRoutes)
    const res = await app.request('/admin/api/plugins', {}, { DB: {} })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /home/tian/Projects/blog && pnpm --filter @worker-blog/server test -- admin-api-plugins
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement plugins list API route**

Create `packages/server/src/routes/admin-api-plugins.ts`:

```typescript
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { PluginService } from '../services'
import { PLUGIN_REGISTRY } from '../plugins/manifest-registry'
import type { PluginsListResponse } from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiPluginsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiPluginsRoutes.use('*', requireAuth())
adminApiPluginsRoutes.use('*', requireRole(['admin', 'editor']))

function formatLastUpdated(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
  if (diff < 2592000) return `${Math.floor(diff / 604800)} weeks ago`
  return `${Math.floor(diff / 2592000)} months ago`
}

adminApiPluginsRoutes.get('/', async (c) => {
  const pluginService = new PluginService(c.env.DB)

  let installedPlugins: any[] = []
  let stats = { total: 0, active: 0, inactive: 0, errors: 0, uninstalled: 0 }
  try {
    installedPlugins = await pluginService.getAllPlugins()
    stats = await pluginService.getPluginStats()
  } catch {}

  const availablePlugins = Object.values(PLUGIN_REGISTRY).map(p => ({
    id: p.id, name: p.codeName, displayName: p.displayName, description: p.description,
    version: p.version, author: p.author, category: p.category, icon: p.iconEmoji,
    permissions: p.permissions, dependencies: p.dependencies, is_core: p.is_core,
  }))

  const installedIds = new Set(installedPlugins.map((p: any) => p.id))

  const installedItems = installedPlugins.map((p: any) => ({
    id: p.id, name: p.name, displayName: p.display_name, description: p.description,
    version: p.version, author: p.author, status: p.status as any, category: p.category,
    icon: p.icon, lastUpdated: formatLastUpdated(p.last_updated), isCore: p.is_core,
    dependencies: p.dependencies || [], permissions: p.permissions || [],
  }))

  const uninstalledItems = availablePlugins
    .filter(p => !installedIds.has(p.id))
    .map(p => ({
      id: p.id, name: p.name, displayName: p.displayName, description: p.description,
      version: p.version, author: p.author, status: 'uninstalled' as const,
      category: p.category, icon: p.icon, lastUpdated: 'Not installed', isCore: p.is_core,
      dependencies: p.dependencies || [], permissions: p.permissions || [],
    }))

  stats.uninstalled = uninstalledItems.length
  stats.total = installedPlugins.length + uninstalledItems.length

  const response: PluginsListResponse = {
    plugins: [...installedItems, ...uninstalledItems],
    stats,
  }
  return c.json(response)
})
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /home/tian/Projects/blog && pnpm --filter @worker-blog/server test -- admin-api-plugins
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Mount route in admin-api.ts**

Edit `packages/server/src/routes/admin-api.ts` — add import:

```typescript
import { adminApiPluginsRoutes } from './admin-api-plugins'
```

Add mount after the logs route line:

```typescript
adminApiRoutes.route('/plugins', adminApiPluginsRoutes)
```

- [ ] **Step 6: Type-check and commit**

```bash
cd /home/tian/Projects/blog && pnpm type-check && git add packages/server/src/routes/admin-api-plugins.ts packages/server/src/routes/admin-api-plugins.test.ts packages/server/src/routes/admin-api.ts && git commit -m "feat: add GET /admin/api/plugins endpoint"
```

---

## Task 6: Server API — api-reference endpoint

**Files:**
- Create: `packages/server/src/routes/admin-api-routes.ts`
- Create: `packages/server/src/routes/admin-api-routes.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/server/src/routes/admin-api-routes.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

vi.mock('../services/route-metadata', () => ({
  buildRouteList: () => [
    { method: 'GET', path: '/api/health', description: 'Health check', authentication: false, category: 'system', documented: true },
  ],
  getAppInstance: () => ({}),
}))

vi.mock('../utils/version', () => ({ getCoreVersion: () => '1.2.3' }))

import { adminApiRoutesRoutes } from './admin-api-routes'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'a@example.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/admin/api/api-reference', adminApiRoutesRoutes)
  return app
}

describe('GET /admin/api/api-reference', () => {
  it('returns endpoints and version', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/api-reference')
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('endpoints')
    expect(json).toHaveProperty('version')
    expect(json.version).toBe('1.2.3')
    expect(json.endpoints).toHaveLength(1)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/admin/api/api-reference', adminApiRoutesRoutes)
    const res = await app.request('/admin/api/api-reference')
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /home/tian/Projects/blog && pnpm --filter @worker-blog/server test -- admin-api-routes
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement api-reference API route**

Create `packages/server/src/routes/admin-api-routes.ts`:

```typescript
import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { buildRouteList, getAppInstance } from '../services/route-metadata'
import { getCoreVersion } from '../utils/version'
import type { ApiReferenceResponse } from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiRoutesRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiRoutesRoutes.use('*', requireAuth())
adminApiRoutesRoutes.use('*', requireRole(['admin', 'editor']))

adminApiRoutesRoutes.get('/', (c) => {
  const endpoints = buildRouteList(getAppInstance())
  const response: ApiReferenceResponse = {
    endpoints,
    version: getCoreVersion(),
  }
  return c.json(response)
})
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /home/tian/Projects/blog && pnpm --filter @worker-blog/server test -- admin-api-routes
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Mount route in admin-api.ts**

Edit `packages/server/src/routes/admin-api.ts` — add import:

```typescript
import { adminApiRoutesRoutes } from './admin-api-routes'
```

Add mount after the plugins route line:

```typescript
adminApiRoutes.route('/api-reference', adminApiRoutesRoutes)
```

- [ ] **Step 6: Run all server tests, type-check, and commit**

```bash
cd /home/tian/Projects/blog && pnpm --filter @worker-blog/server test && pnpm type-check
```

Expected: all existing tests pass plus 2 new. No type errors.

```bash
cd /home/tian/Projects/blog && git add packages/server/src/routes/admin-api-routes.ts packages/server/src/routes/admin-api-routes.test.ts packages/server/src/routes/admin-api.ts && git commit -m "feat: add GET /admin/api/api-reference endpoint"
```

---

## Task 7: Admin SPA API hooks

**Files:**
- Create: `packages/admin/src/spa/api/dashboard.ts`
- Create: `packages/admin/src/spa/api/logs.ts`
- Create: `packages/admin/src/spa/api/plugins.ts`
- Create: `packages/admin/src/spa/api/routes.ts`

- [ ] **Step 1: Create dashboard hook**

Create `packages/admin/src/spa/api/dashboard.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import type { DashboardResponse } from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function useDashboard() {
  return useQuery<DashboardResponse>({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminFetch<DashboardResponse>('/admin/api/dashboard'),
  })
}
```

- [ ] **Step 2: Create logs hooks**

Create `packages/admin/src/spa/api/logs.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import type { LogsListResponse, LogDetailsResponse, LogConfigResponse } from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export interface LogsFilters {
  page?: number
  limit?: number
  level?: string
  category?: string
  search?: string
  source?: string
  start_date?: string
  end_date?: string
}

export function useLogsList(filters: LogsFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.level) params.set('level', filters.level)
  if (filters.category) params.set('category', filters.category)
  if (filters.search) params.set('search', filters.search)
  if (filters.source) params.set('source', filters.source)
  if (filters.start_date) params.set('start_date', filters.start_date)
  if (filters.end_date) params.set('end_date', filters.end_date)
  const qs = params.toString()

  return useQuery<LogsListResponse>({
    queryKey: ['admin', 'logs', filters],
    queryFn: () => adminFetch<LogsListResponse>(`/admin/api/logs${qs ? `?${qs}` : ''}`),
  })
}

export function useLogDetails(id: string) {
  return useQuery<LogDetailsResponse>({
    queryKey: ['admin', 'logs', id],
    queryFn: () => adminFetch<LogDetailsResponse>(`/admin/api/logs/${id}`),
    enabled: Boolean(id),
  })
}

export function useLogConfig() {
  return useQuery<LogConfigResponse>({
    queryKey: ['admin', 'logs', 'config'],
    queryFn: () => adminFetch<LogConfigResponse>('/admin/api/logs/config'),
  })
}
```

- [ ] **Step 3: Create plugins hook**

Create `packages/admin/src/spa/api/plugins.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import type { PluginsListResponse } from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function usePluginsList() {
  return useQuery<PluginsListResponse>({
    queryKey: ['admin', 'plugins'],
    queryFn: () => adminFetch<PluginsListResponse>('/admin/api/plugins'),
  })
}
```

- [ ] **Step 4: Create api-reference hook**

Create `packages/admin/src/spa/api/routes.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import type { ApiReferenceResponse } from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function useApiReference() {
  return useQuery<ApiReferenceResponse>({
    queryKey: ['admin', 'api-reference'],
    queryFn: () => adminFetch<ApiReferenceResponse>('/admin/api/api-reference'),
  })
}
```

- [ ] **Step 5: Type-check**

```bash
cd /home/tian/Projects/blog && pnpm type-check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/tian/Projects/blog && git add packages/admin/src/spa/api/dashboard.ts packages/admin/src/spa/api/logs.ts packages/admin/src/spa/api/plugins.ts packages/admin/src/spa/api/routes.ts && git commit -m "feat: add React Query hooks for phase 3 API endpoints"
```

---

## Task 8: React page — Dashboard

**Files:**
- Create: `packages/admin/src/spa/pages/dashboard.tsx`

- [ ] **Step 1: Create dashboard page**

Create `packages/admin/src/spa/pages/dashboard.tsx`:

```tsx
import { useDashboard } from '../api/dashboard'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboard()

  return (
    <section className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your blog." />

      {isLoading ? <LoadingState label="Loading dashboard" /> : null}

      {isError ? (
        <Alert title="Failed to load dashboard" tone="danger">
          Could not fetch dashboard data. Try refreshing the page.
        </Alert>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Collections', value: data.stats.collections },
              { label: 'Content items', value: data.stats.contentItems },
              { label: 'Media files', value: data.stats.mediaFiles },
              { label: 'Users', value: data.stats.users },
              { label: 'Media size', value: formatBytes(data.stats.mediaSize) },
              { label: 'DB size', value: formatBytes(data.stats.databaseSize) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">Recent activity</h2>
            </div>
            {data.recentActivity.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.recentActivity.map(item => (
                  <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{item.user}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">{formatTime(item.timestamp)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium">Live metrics</h2>
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Requests/sec</p>
                <p className="text-lg font-semibold">{data.metrics.requestsPerSecond.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total requests</p>
                <p className="text-lg font-semibold">{data.metrics.totalRequests}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg RPS</p>
                <p className="text-lg font-semibold">{data.metrics.averageRPS.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 2: Wire route in router.tsx**

Edit `packages/admin/src/spa/router.tsx` — add import at top:

```typescript
import { DashboardPage } from './pages/dashboard'
```

Add route inside the `AdminLayout` children array (before the `*` wildcard):

```typescript
{ path: 'dashboard', element: <DashboardPage /> },
```

- [ ] **Step 3: Update nav item in admin-layout.tsx**

Edit `packages/admin/src/spa/layouts/admin-layout.tsx` — change the Dashboard nav item from `legacy: true` to no legacy flag:

```typescript
{ label: 'Dashboard', href: '/admin/dashboard', icon: Gauge },
```

- [ ] **Step 4: Build and type-check**

```bash
cd /home/tian/Projects/blog && pnpm type-check && pnpm --filter @worker-blog/admin build
```

Expected: no errors, build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /home/tian/Projects/blog && git add packages/admin/src/spa/pages/dashboard.tsx packages/admin/src/spa/router.tsx packages/admin/src/spa/layouts/admin-layout.tsx && git commit -m "feat: add React Dashboard page"
```

---

## Task 9: React page — Logs list

**Files:**
- Create: `packages/admin/src/spa/pages/logs-list.tsx`

- [ ] **Step 1: Create logs list page**

Create `packages/admin/src/spa/pages/logs-list.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router'
import { useLogsList } from '../api/logs'
import type { LogsFilters } from '../api/logs'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { FilterBar } from '../components/ui/filter-bar'
import { LoadingState } from '../components/ui/loading-state'
import { Pagination } from '../components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

const LEVEL_COLORS: Record<string, string> = {
  debug: 'bg-muted text-muted-foreground',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  warn: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  fatal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
}

export function LogsListPage() {
  const [filters, setFilters] = useState<LogsFilters>({ page: 1, limit: 50 })
  const { data, isLoading, isError } = useLogsList(filters)

  const page = filters.page ?? 1
  const pageCount = data?.pagination.totalPages ?? 1

  return (
    <section className="space-y-4">
      <PageHeader title="Logs" description="System and application event logs.">
        <Link className="text-sm text-muted-foreground hover:underline" to="/admin/logs/config">
          Configure
        </Link>
      </PageHeader>

      <FilterBar
        searchLabel="Search logs"
        onSubmit={e => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          setFilters({ page: 1, limit: 50, search: (form.get('q') as string) || undefined })
        }}
      />

      {isLoading ? <LoadingState label="Loading logs" /> : null}
      {isError ? (
        <Alert title="Failed to load logs" tone="danger">Could not fetch logs.</Alert>
      ) : null}

      {data ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No logs found.
                  </TableCell>
                </TableRow>
              ) : data.logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge className={LEVEL_COLORS[log.level] ?? ''}>{log.level}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{log.category}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    <Link className="hover:underline" to={`/admin/logs/${log.id}`}>
                      {log.message}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.source ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            pageCount={pageCount}
            previousHref={page > 1 ? undefined : undefined}
            nextHref={page < pageCount ? undefined : undefined}
          />
          <p className="text-xs text-muted-foreground text-right">
            {data.pagination.totalItems} total
          </p>
        </>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 2: Wire route in router.tsx**

Edit `packages/admin/src/spa/router.tsx` — add import:

```typescript
import { LogsListPage } from './pages/logs-list'
```

Add route in `AdminLayout` children:

```typescript
{ path: 'logs', element: <LogsListPage /> },
```

- [ ] **Step 3: Update Logs nav item in admin-layout.tsx**

Find and update the Logs nav entry. Currently `Logs` is not present as a direct link (it may be linked via legacy). If there is no `Logs` entry, add one:

```typescript
{ label: 'Logs', href: '/admin/logs', icon: Activity },
```

If it already exists with `legacy: true`, remove `legacy: true`.

- [ ] **Step 4: Build and type-check**

```bash
cd /home/tian/Projects/blog && pnpm type-check && pnpm --filter @worker-blog/admin build
```

- [ ] **Step 5: Commit**

```bash
cd /home/tian/Projects/blog && git add packages/admin/src/spa/pages/logs-list.tsx packages/admin/src/spa/router.tsx packages/admin/src/spa/layouts/admin-layout.tsx && git commit -m "feat: add React Logs List page"
```

---

## Task 10: React pages — Log details and Log config

**Files:**
- Create: `packages/admin/src/spa/pages/log-details.tsx`
- Create: `packages/admin/src/spa/pages/log-config.tsx`

- [ ] **Step 1: Create log details page**

Create `packages/admin/src/spa/pages/log-details.tsx`:

```tsx
import { useParams, Link } from 'react-router'
import { useLogDetails } from '../api/logs'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'

export function LogDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useLogDetails(id ?? '')

  return (
    <section className="space-y-4">
      <PageHeader title="Log Details">
        <Link className="text-sm text-muted-foreground hover:underline" to="/admin/logs">
          ← Back to logs
        </Link>
      </PageHeader>

      {isLoading ? <LoadingState label="Loading log entry" /> : null}
      {isError ? (
        <Alert title="Log not found" tone="danger">This log entry could not be loaded.</Alert>
      ) : null}

      {data ? (
        <div className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap gap-2">
            <Badge>{data.log.level}</Badge>
            <Badge>{data.log.category}</Badge>
          </div>
          <p className="text-sm font-medium">{data.log.message}</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              { label: 'Time', value: new Date(data.log.createdAt).toLocaleString() },
              { label: 'Source', value: data.log.source },
              { label: 'Method', value: data.log.method },
              { label: 'URL', value: data.log.url },
              { label: 'Status', value: data.log.statusCode },
              { label: 'Duration', value: data.log.duration != null ? `${data.log.duration}ms` : null },
              { label: 'IP', value: data.log.ipAddress },
              { label: 'User ID', value: data.log.userId },
            ]
              .filter(({ value }) => value != null)
              .map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="truncate">{String(value)}</dd>
                </div>
              ))}
          </dl>
          {data.log.data != null ? (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Data</p>
              <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
                {JSON.stringify(data.log.data, null, 2)}
              </pre>
            </div>
          ) : null}
          {data.log.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {data.log.tags.map(tag => <Badge key={tag}>{tag}</Badge>)}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 2: Create log config page**

Create `packages/admin/src/spa/pages/log-config.tsx`:

```tsx
import { Link } from 'react-router'
import { useLogConfig } from '../api/logs'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

export function LogConfigPage() {
  const { data, isLoading, isError } = useLogConfig()

  return (
    <section className="space-y-4">
      <PageHeader title="Log Configuration" description="Per-category log settings (read only).">
        <Link className="text-sm text-muted-foreground hover:underline" to="/admin/logs">
          ← Back to logs
        </Link>
      </PageHeader>

      {isLoading ? <LoadingState label="Loading log config" /> : null}
      {isError ? (
        <Alert title="Failed to load config" tone="danger">Could not fetch log configuration.</Alert>
      ) : null}

      {data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Min level</TableHead>
              <TableHead>Retention (days)</TableHead>
              <TableHead>Max size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No config entries found.
                </TableCell>
              </TableRow>
            ) : data.configs.map(cfg => (
              <TableRow key={cfg.id}>
                <TableCell className="font-medium">{cfg.category}</TableCell>
                <TableCell>
                  <Badge className={cfg.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}>
                    {cfg.enabled ? 'Yes' : 'No'}
                  </Badge>
                </TableCell>
                <TableCell>{cfg.level}</TableCell>
                <TableCell>{cfg.retention}</TableCell>
                <TableCell>{cfg.maxSize ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 3: Wire routes in router.tsx**

Edit `packages/admin/src/spa/router.tsx` — add imports:

```typescript
import { LogDetailsPage } from './pages/log-details'
import { LogConfigPage } from './pages/log-config'
```

Add routes in `AdminLayout` children (after `logs` route):

```typescript
{ path: 'logs/config', element: <LogConfigPage /> },
{ path: 'logs/:id', element: <LogDetailsPage /> },
```

- [ ] **Step 4: Build and type-check**

```bash
cd /home/tian/Projects/blog && pnpm type-check && pnpm --filter @worker-blog/admin build
```

- [ ] **Step 5: Commit**

```bash
cd /home/tian/Projects/blog && git add packages/admin/src/spa/pages/log-details.tsx packages/admin/src/spa/pages/log-config.tsx packages/admin/src/spa/router.tsx && git commit -m "feat: add React Log Details and Log Config pages"
```

---

## Task 11: React page — API Reference

**Files:**
- Create: `packages/admin/src/spa/pages/api-reference.tsx`

- [ ] **Step 1: Create api-reference page**

Create `packages/admin/src/spa/pages/api-reference.tsx`:

```tsx
import { useState } from 'react'
import { useApiReference } from '../api/routes'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { FilterBar } from '../components/ui/filter-bar'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  POST: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  PATCH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export function ApiReferencePage() {
  const { data, isLoading, isError } = useApiReference()
  const [search, setSearch] = useState('')

  const endpoints = (data?.endpoints ?? []).filter(ep =>
    !search || ep.path.toLowerCase().includes(search.toLowerCase()) || ep.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <section className="space-y-4">
      <PageHeader
        title="API Reference"
        description={data ? `${data.endpoints.length} endpoints · v${data.version}` : 'All registered API endpoints.'}
      />

      <FilterBar
        searchLabel="Search endpoints"
        onSubmit={e => { e.preventDefault(); setSearch((new FormData(e.currentTarget).get('q') as string) || '') }}
      />

      {isLoading ? <LoadingState label="Loading endpoints" /> : null}
      {isError ? (
        <Alert title="Failed to load API reference" tone="danger">Could not fetch endpoint list.</Alert>
      ) : null}

      {data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Auth</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {endpoints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No endpoints match your search.
                </TableCell>
              </TableRow>
            ) : endpoints.map((ep, i) => (
              <TableRow key={`${ep.method}-${ep.path}-${i}`}>
                <TableCell>
                  <Badge className={METHOD_COLORS[ep.method] ?? ''}>{ep.method}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{ep.path}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{ep.category ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {ep.authentication === true ? 'Required' : ep.authentication === false ? 'Public' : '?'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{ep.description ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 2: Wire route in router.tsx**

Edit `packages/admin/src/spa/router.tsx` — add import:

```typescript
import { ApiReferencePage } from './pages/api-reference'
```

Add route in `AdminLayout` children:

```typescript
{ path: 'api-reference', element: <ApiReferencePage /> },
```

- [ ] **Step 3: Update API Reference nav item in admin-layout.tsx**

Remove `legacy: true` from the API Reference nav item:

```typescript
{ label: 'API Reference', href: '/admin/api-reference', icon: BookOpen },
```

- [ ] **Step 4: Build and type-check**

```bash
cd /home/tian/Projects/blog && pnpm type-check && pnpm --filter @worker-blog/admin build
```

- [ ] **Step 5: Commit**

```bash
cd /home/tian/Projects/blog && git add packages/admin/src/spa/pages/api-reference.tsx packages/admin/src/spa/router.tsx packages/admin/src/spa/layouts/admin-layout.tsx && git commit -m "feat: add React API Reference page"
```

---

## Task 12: React page — Plugins list

**Files:**
- Create: `packages/admin/src/spa/pages/plugins-list.tsx`

- [ ] **Step 1: Create plugins list page**

Create `packages/admin/src/spa/pages/plugins-list.tsx`:

```tsx
import { usePluginsList } from '../api/plugins'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import type { PluginStatus } from '@worker-blog/shared/admin-api'

const STATUS_COLORS: Record<PluginStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  inactive: 'bg-muted text-muted-foreground',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  uninstalled: 'bg-muted text-muted-foreground opacity-60',
}

export function PluginsListPage() {
  const { data, isLoading, isError } = usePluginsList()

  return (
    <section className="space-y-4">
      <PageHeader title="Plugins" description="Installed and available plugins." />

      {isLoading ? <LoadingState label="Loading plugins" /> : null}
      {isError ? (
        <Alert title="Failed to load plugins" tone="danger">Could not fetch plugin list.</Alert>
      ) : null}

      {data ? (
        <>
          <div className="flex flex-wrap gap-4 text-sm">
            {[
              { label: 'Total', value: data.stats.total },
              { label: 'Active', value: data.stats.active },
              { label: 'Inactive', value: data.stats.inactive },
              { label: 'Errors', value: data.stats.errors },
              { label: 'Uninstalled', value: data.stats.uninstalled },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-md border border-border bg-card px-3 py-2">
                <span className="text-muted-foreground">{label}: </span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plugin</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.plugins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No plugins found.
                  </TableCell>
                </TableRow>
              ) : data.plugins.map(plugin => (
                <TableRow key={plugin.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="text-lg">{plugin.icon}</span>
                      <div>
                        <p className="font-medium">{plugin.displayName}</p>
                        <p className="text-xs text-muted-foreground">{plugin.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{plugin.version}</TableCell>
                  <TableCell>
                    <Badge>{plugin.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[plugin.status]}>{plugin.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{plugin.lastUpdated}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 2: Wire route in router.tsx**

Edit `packages/admin/src/spa/router.tsx` — add import:

```typescript
import { PluginsListPage } from './pages/plugins-list'
```

Add route in `AdminLayout` children:

```typescript
{ path: 'plugins', element: <PluginsListPage /> },
```

- [ ] **Step 3: Update Plugins nav item in admin-layout.tsx**

Remove `legacy: true` from the Plugins nav item:

```typescript
{ label: 'Plugins', href: '/admin/plugins', icon: Plug },
```

- [ ] **Step 4: Build and type-check**

```bash
cd /home/tian/Projects/blog && pnpm type-check && pnpm --filter @worker-blog/admin build
```

- [ ] **Step 5: Commit**

```bash
cd /home/tian/Projects/blog && git add packages/admin/src/spa/pages/plugins-list.tsx packages/admin/src/spa/router.tsx packages/admin/src/spa/layouts/admin-layout.tsx && git commit -m "feat: add React Plugins List page"
```

---

## Task 13: Final verification

- [ ] **Step 1: Run all server tests**

```bash
cd /home/tian/Projects/blog && pnpm --filter @worker-blog/server test
```

Expected: all tests pass (≥ 23 test files, ≥ 547 tests from before + ~11 new).

- [ ] **Step 2: Run admin tests**

```bash
cd /home/tian/Projects/blog && pnpm --filter @worker-blog/admin test
```

Expected: all tests pass.

- [ ] **Step 3: Full type-check and build**

```bash
cd /home/tian/Projects/blog && pnpm type-check && pnpm --filter @worker-blog/admin build
```

Expected: no errors.

- [ ] **Step 4: Update task_plan.md and progress.md**

Edit `docs/react-migration/task_plan.md` — mark Phase 3 tasks complete:

Add under `### Phase 3: Low-Risk Page Migration`:

```markdown
### Phase 3: Low-Risk Page Migration

- [x] Add shared response types: DashboardResponse, LogsListResponse, LogDetailsResponse, LogConfigResponse, PluginsListResponse, ApiReferenceResponse.
- [x] Add GET /admin/api/dashboard (stats + activity + metrics consolidated).
- [x] Add GET /admin/api/logs, /logs/config, /logs/:id.
- [x] Add GET /admin/api/plugins.
- [x] Add GET /admin/api/api-reference.
- [x] Add React pages: dashboard, logs-list, log-details, log-config, api-reference, plugins-list.
- [x] Wire 6 new routes into SPA router.
- [x] Remove legacy: true from migrated nav items.
```

- [ ] **Step 5: Final commit**

```bash
cd /home/tian/Projects/blog && git add docs/react-migration/ && git commit -m "docs: mark Phase 3 complete in migration plan"
```
