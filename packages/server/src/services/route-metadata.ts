/**
 * Route Metadata Service
 *
 * Auto-discovers API routes using Hono's inspectRoutes() and enriches them
 * with shared route metadata. Routes without metadata still appear as
 * auto-discovered, so nothing is hidden from the API reference.
 */

import { inspectRoutes } from 'hono/dev'
import {
  CATEGORY_INFO,
  ROUTE_METADATA,
  inferAuth,
  inferCategory,
  isIncludedRoute
} from '@worker-blog/shared/routes'
import type { RouteMetadata } from '@worker-blog/shared/routes'

export { CATEGORY_INFO }
export type { RouteMetadata } from '@worker-blog/shared/routes'

let appInstance: any = null
let cachedRouteList: RouteMetadata[] | null = null

export function setAppInstance(app: any): void {
  appInstance = app
  cachedRouteList = null
}

export function getAppInstance(): any {
  return appInstance
}

export function buildRouteList(app: any): RouteMetadata[] {
  if (cachedRouteList) return cachedRouteList

  if (!app) return []

  try {
    const routes = inspectRoutes(app as any)
    const seen = new Set<string>()
    const result: RouteMetadata[] = []

    for (const route of routes) {
      if (route.isMiddleware) continue
      if (route.method === 'ALL') continue

      const key = `${route.method} ${route.path}`
      if (seen.has(key)) continue
      seen.add(key)

      if (!isIncludedRoute(route.method, route.path)) continue

      const meta = ROUTE_METADATA[key]
      result.push({
        method: route.method,
        path: route.path,
        description: meta?.description ?? '',
        authentication: meta?.authentication ?? inferAuth(route.path),
        category: meta?.category ?? inferCategory(route.path),
        documented: Boolean(meta)
      })
    }

    const methodOrder: Record<string, number> = { GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4 }
    result.sort((a, b) => {
      const catCmp = a.category.localeCompare(b.category)
      if (catCmp !== 0) return catCmp
      const methCmp = (methodOrder[a.method] ?? 5) - (methodOrder[b.method] ?? 5)
      if (methCmp !== 0) return methCmp
      return a.path.localeCompare(b.path)
    })

    cachedRouteList = result
    return result
  } catch (error) {
    console.error('Failed to inspect routes:', error)
    return []
  }
}
