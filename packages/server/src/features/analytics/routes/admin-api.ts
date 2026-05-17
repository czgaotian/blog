import { Hono } from 'hono'
import type { AdminApiResponse, AnalyticsAdminDashboardData } from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../../../app'
import { requireAuth, requireRole } from '../../../middleware'
import { EventTrackingService } from '../services/event-tracking-service'

const analyticsAdminApiRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

analyticsAdminApiRoutes.use('*', requireAuth())
analyticsAdminApiRoutes.use('*', requireRole('admin'))

function success<T>(data: T, message?: string): AdminApiResponse<T> {
  return message ? { success: true, data, message } : { success: true, data }
}

function failure(error: string, message?: string): AdminApiResponse<never> {
  return message ? { success: false, error, message } : { success: false, error }
}

async function getSystemLogDashboard(db: Bindings['DB']) {
  let totalRequests = 0
  let uniqueIPs = 0
  let avgDuration = 0
  let errorCount = 0
  let topPages: Array<{ path: string; views: number }> = []
  let recentActivity: Array<{ url: string; method: string; status_code: number; duration: number; created_at: number }> = []

  try {
    const now = Math.floor(Date.now() / 1000)
    const dayAgo = now - 86400

    const [requestsResult, ipsResult, durationResult, errorsResult, pagesResult, activityResult] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM system_logs WHERE category = ? AND created_at > ?')
        .bind('api', dayAgo).first() as Promise<{ count: number } | null>,
      db.prepare('SELECT COUNT(DISTINCT ip_address) as count FROM system_logs WHERE category = ? AND created_at > ?')
        .bind('api', dayAgo).first() as Promise<{ count: number } | null>,
      db.prepare('SELECT AVG(duration) as avg FROM system_logs WHERE category = ? AND created_at > ? AND duration IS NOT NULL')
        .bind('api', dayAgo).first() as Promise<{ avg: number } | null>,
      db.prepare('SELECT COUNT(*) as count FROM system_logs WHERE level IN (?, ?) AND created_at > ?')
        .bind('error', 'fatal', dayAgo).first() as Promise<{ count: number } | null>,
      db.prepare('SELECT url, COUNT(*) as views FROM system_logs WHERE category = ? AND created_at > ? AND url IS NOT NULL GROUP BY url ORDER BY views DESC LIMIT 10')
        .bind('api', dayAgo).all(),
      db.prepare('SELECT url, method, status_code, duration, created_at FROM system_logs WHERE category = ? ORDER BY created_at DESC LIMIT 20')
        .bind('api').all(),
    ])

    totalRequests = requestsResult?.count || 0
    uniqueIPs = ipsResult?.count || 0
    avgDuration = Math.round(durationResult?.avg || 0)
    errorCount = errorsResult?.count || 0
    topPages = (pagesResult.results || []).map((row: any) => ({ path: row.url, views: row.views }))
    recentActivity = (activityResult.results || []) as any[]
  } catch {
    // system_logs may be absent during first boot or in tests.
  }

  return {
    systemStats: {
      totalRequests,
      uniqueIPs,
      avgDuration,
      errorCount,
    },
    topPages,
    recentActivity,
  }
}

analyticsAdminApiRoutes.get('/', async (c) => {
  try {
    const service = new EventTrackingService(c.env.DB)
    const now = Math.floor(Date.now() / 1000)
    const dayAgo = now - 86400
    const system = await getSystemLogDashboard(c.env.DB)
    let eventStats = {
      totalEvents: 0,
      uniqueUsers: 0,
      uniqueSessions: 0,
      topEvents: [] as Array<{ event: string; count: number }>,
    }
    let events = {
      events: [] as any[],
      total: 0,
    }

    try {
      ;[eventStats, events] = await Promise.all([
        service.getStats(dayAgo, now),
        service.queryEvents({ startDate: dayAgo, endDate: now, limit: 50, offset: 0 }),
      ])
    } catch {
      // analytics_events may be absent during first boot or in tests.
    }

    return c.json(success<AnalyticsAdminDashboardData>({
      ...system,
      eventStats,
      events: events.events,
      eventTotal: events.total,
    }))
  } catch (error) {
    console.error('Error fetching Analytics dashboard:', error)
    return c.json(failure('Failed to fetch Analytics dashboard'), 500)
  }
})

export default analyticsAdminApiRoutes
