import { Hono } from 'hono'
import type {
  AdminApiResponse,
  SecurityAuditAdminDashboardData,
  SecurityAuditPurgeResponse,
} from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../../../app'
import { requireAuth, requireRole } from '../../../middleware'
import { BruteForceDetector } from '../services/brute-force-detector'
import { SecurityAuditService } from '../services/security-audit-service'
import type { SecurityAuditSettings, SecurityEventFilters, SecurityEventType, SecuritySeverity } from '../types'
import { DEFAULT_SETTINGS } from '../types'

const securityAuditAdminApiRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

securityAuditAdminApiRoutes.use('*', requireAuth())
securityAuditAdminApiRoutes.use('*', requireRole('admin'))

function success<T>(data: T, message?: string): AdminApiResponse<T> {
  return message ? { success: true, data, message } : { success: true, data }
}

function failure(error: string, message?: string): AdminApiResponse<never> {
  return message ? { success: false, error, message } : { success: false, error }
}

async function getSettings(_db: Bindings['DB']): Promise<SecurityAuditSettings> {
  return DEFAULT_SETTINGS
}

securityAuditAdminApiRoutes.get('/', async (c) => {
  try {
    const settings = await getSettings(c.env.DB)
    const service = new SecurityAuditService(c.env.DB, settings)
    const detector = new BruteForceDetector(c.env.CACHE_KV, settings.bruteForce)

    const filters: SecurityEventFilters = {
      eventType: c.req.query('type') as SecurityEventType | undefined,
      severity: c.req.query('severity') as SecuritySeverity | undefined,
      email: c.req.query('email') || undefined,
      ipAddress: c.req.query('ip') || undefined,
      search: c.req.query('search') || undefined,
      page: c.req.query('page') ? parseInt(c.req.query('page')!, 10) : 1,
      limit: c.req.query('limit') ? Math.min(parseInt(c.req.query('limit')!, 10), 100) : 50,
      sortBy: 'created_at',
      sortOrder: 'desc',
    }

    const [
      stats,
      topIPs,
      hourlyTrend,
      recentCritical,
      events,
      lockouts,
    ] = await Promise.all([
      service.getStats(),
      service.getTopIPs(10),
      service.getHourlyTrend(24),
      service.getRecentCriticalEvents(20),
      service.getEvents(filters),
      detector.getActiveLockouts(),
    ])

    return c.json(success<SecurityAuditAdminDashboardData>({
      stats,
      topIPs,
      hourlyTrend,
      recentCritical,
      events: events.events,
      eventTotal: events.total,
      lockouts,
      settings,
    }))
  } catch (error) {
    console.error('Error fetching Security Audit dashboard:', error)
    return c.json(failure('Failed to fetch Security Audit dashboard'), 500)
  }
})

securityAuditAdminApiRoutes.delete('/lockouts/:key', async (c) => {
  try {
    const settings = await getSettings(c.env.DB)
    const detector = new BruteForceDetector(c.env.CACHE_KV, settings.bruteForce)
    await detector.releaseLockout(decodeURIComponent(c.req.param('key')))
    return c.json(success({ released: true }, 'Lockout released'))
  } catch (error) {
    console.error('Error releasing Security Audit lockout:', error)
    return c.json(failure('Failed to release lockout'), 500)
  }
})

securityAuditAdminApiRoutes.post('/events/purge', async (c) => {
  try {
    const settings = await getSettings(c.env.DB)
    const service = new SecurityAuditService(c.env.DB, settings)
    const body = await c.req.json().catch(() => ({})) as { daysToKeep?: number }
    const deleted = await service.purgeOldEvents(body.daysToKeep)
    return c.json(success<SecurityAuditPurgeResponse>({ deleted }, 'Old security events purged'))
  } catch (error) {
    console.error('Error purging Security Audit events:', error)
    return c.json(failure('Failed to purge security events'), 500)
  }
})

export default securityAuditAdminApiRoutes
