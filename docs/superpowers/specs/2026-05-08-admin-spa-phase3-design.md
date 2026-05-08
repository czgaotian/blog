# Admin SPA Phase 3 — Low-Risk Page Migration Design

Date: 2026-05-08

## Scope

Migrate 6 display-only admin pages from legacy Hono HTML templates to React SPA + JSON API:

- Dashboard
- Logs list
- Log details
- Log config (display only, no mutations)
- API Reference
- Plugins list

Phase 3 is read-only. Form mutations (log config update, plugin settings) are deferred to Phase 4.

## Decisions

- **Dashboard endpoint**: consolidate the four HTMX fragment endpoints (`/stats`, `/storage`, `/recent-activity`, `/system-status`) into a single `GET /admin/api/dashboard` response. Reduces round trips and simplifies React Query usage.
- **Log config mutations**: `POST /admin/api/logs/config/:category` and `POST /admin/api/logs/cleanup` deferred to Phase 4 (form migration phase).
- **Architecture**: dedicated server API files per feature area, mounted under `/admin/api/`. Query logic extracted into shared functions reused by legacy HTML routes during the transition.

## Shared Types (`packages/shared/src/admin-api/`)

### `dashboard.ts`

```ts
export interface DashboardStats {
  collections: number
  contentItems: number
  mediaFiles: number
  users: number
  mediaSize: number
  databaseSize: number
}

export interface ActivityItem {
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
  recentActivity: ActivityItem[]
  metrics: DashboardMetrics
}
```

### `logs.ts`

```ts
export interface LogEntry {
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

export interface LogsListResponse {
  logs: LogEntry[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
  }
  filters: {
    level: string
    category: string
    search: string
    startDate: string
    endDate: string
    source: string
  }
}

export interface LogDetailsResponse {
  log: LogEntry
}

export interface LogConfig {
  category: string
  enabled: boolean
  level: string
  retention: number
  maxSize: number
}

export interface LogConfigResponse {
  configs: LogConfig[]
}
```

### `plugins.ts`

```ts
export interface PluginItem {
  id: string
  name: string
  displayName: string
  description: string
  version: string
  author: string
  status: 'active' | 'inactive' | 'error' | 'uninstalled'
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
  plugins: PluginItem[]
  stats: PluginsStats
}
```

### `routes.ts`

No new types needed. `RouteMetadata` is already defined in `packages/shared/src/routes/metadata.ts` and exported from `@worker-blog/shared/routes`. The API response reuses it directly:

```ts
import type { RouteMetadata } from '@worker-blog/shared/routes'

export interface ApiReferenceResponse {
  endpoints: RouteMetadata[]
  version: string
}
```

### `index.ts`

Re-exports all of the above plus existing `auth.ts`.

## Server API Routes

### `admin-api-dashboard.ts` → `GET /admin/api/dashboard`

Extracts DB queries from `admin-dashboard.ts` (`/stats`, `/storage`, `/recent-activity` handlers) and `metricsTracker` call from `/api/metrics`. Returns `DashboardResponse`.

### `admin-api-logs.ts`

- `GET /admin/api/logs` — paginated list with filters (level, category, search, startDate, endDate, source). Returns `LogsListResponse`.
- `GET /admin/api/logs/config` — returns `LogConfigResponse`.
- `GET /admin/api/logs/:id` — returns `LogDetailsResponse`.

Route order matters: `/config` must be registered before `/:id` to avoid `:id` capturing the string `"config"`.

### `admin-api-plugins.ts` → `GET /admin/api/plugins`

Extracts list-building logic from `admin-plugins.ts`. Returns `PluginsListResponse`. Activate/deactivate/install/uninstall already return JSON — leave untouched.

### `admin-api-routes.ts` → `GET /admin/api/api-reference`

Calls `buildRouteList(getAppInstance())`. Returns `ApiReferenceResponse`.

### Mounting

All four new files are mounted inside `admin-api.ts`:

```ts
adminApiRoutes.route('/dashboard', adminApiDashboardRoutes)
adminApiRoutes.route('/logs', adminApiLogsRoutes)
adminApiRoutes.route('/plugins', adminApiPluginsRoutes)
adminApiRoutes.route('/api-reference', adminApiRoutesRoutes)
```

## Server Tests

For each new endpoint, add route tests (Vitest) covering:
- 200 response with correct shape
- 401 when unauthenticated
- Pagination/filter params for logs list

## React SPA

### API layer (`packages/admin/src/spa/api/`)

One file per feature. Each file exports React Query `useQuery` hooks that call the JSON endpoints via the existing `apiClient`.

### Pages (`packages/admin/src/spa/pages/`)

| File | Route | Query hook |
|------|-------|------------|
| `dashboard.tsx` | `/admin/dashboard` | `useDashboard()` |
| `logs-list.tsx` | `/admin/logs` | `useLogsList(filters)` |
| `log-details.tsx` | `/admin/logs/:id` | `useLogDetails(id)` |
| `log-config.tsx` | `/admin/logs/config` | `useLogConfig()` |
| `api-reference.tsx` | `/admin/api-reference` | `useApiReference()` |
| `plugins-list.tsx` | `/admin/plugins` | `usePluginsList()` |

Each page follows the pattern:
- Loading state → `<LoadingState />`
- Error state → `<ErrorBoundary />` / inline error alert
- Empty state → descriptive empty message
- Data state → layout using existing `<Table>`, `<Pagination>`, `<FilterBar>`, `<Badge>`, `<PageHeader>` primitives from Phase 2

### Router (`router.tsx`)

Add 6 new routes under the `AdminLayout` parent. Old HTML routes become SPA fallback (already handled by the existing SPA shell route) — no 404s.

## Legacy Route Handling

Legacy HTML routes (`/admin`, `/admin/logs`, etc.) are **not deleted** in Phase 3. They stay in place as fallback. The SPA will handle navigation for logged-in users. Hard refresh on any migrated URL returns the SPA shell which then renders the React page.

## Verification

After each page is done:

```sh
pnpm type-check
pnpm --filter @worker-blog/admin build
pnpm --filter @worker-blog/server test
```

Manual checks (in `wrangler dev`):
- Direct URL access (hard refresh)
- SPA in-app navigation
- Loading and error states visible
- Dark mode correct
- Legacy URL still works (no 404)
