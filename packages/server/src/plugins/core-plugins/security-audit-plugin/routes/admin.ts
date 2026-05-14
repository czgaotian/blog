import { Hono } from 'hono'
import { requireAuth } from '../../../../middleware'
import { SecurityAuditService } from '../services/security-audit-service'
import { renderSecurityDashboard, SecurityDashboardData } from '../components/dashboard-page'
import { renderEventLogPage, EventLogPageData } from '../components/event-log-page'
import type { Bindings, Variables } from '../../../../app'
import type { SecurityAuditSettings, SecurityEventType, SecuritySeverity } from '../types'
import { DEFAULT_SETTINGS } from '../types'

const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminRoutes.use('*', requireAuth())

// Check admin role
adminRoutes.use('*', async (c, next) => {
  const user = c.get('user')
  if (user?.role !== 'admin') {
    return c.text('Access denied', 403)
  }
  return next()
})

async function getSettings(_db: any): Promise<SecurityAuditSettings> {
  return DEFAULT_SETTINGS
}

// Dashboard
adminRoutes.get('/', async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const settings = await getSettings(db)
  const service = new SecurityAuditService(db, settings)

  const [stats, topIPs, hourlyTrend, recentCritical] = await Promise.all([
    service.getStats(),
    service.getTopIPs(10),
    service.getHourlyTrend(24),
    service.getRecentCriticalEvents(20)
  ])

  const pageData: SecurityDashboardData = {
    stats,
    topIPs,
    hourlyTrend,
    recentCritical,
    user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
    version: c.get('appVersion')
  }

  return c.html(renderSecurityDashboard(pageData))
})

// Event log
adminRoutes.get('/events', async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const settings = await getSettings(db)
  const service = new SecurityAuditService(db, settings)

  const page = parseInt(c.req.query('page') || '1')
  const limit = 50

  const filters = {
    eventType: (c.req.query('type') as SecurityEventType) || undefined,
    severity: (c.req.query('severity') as SecuritySeverity) || undefined,
    email: c.req.query('email') || undefined,
    ipAddress: c.req.query('ip') || undefined,
    search: c.req.query('search') || undefined,
    page,
    limit
  }

  const { events, total } = await service.getEvents(filters)
  const totalPages = Math.ceil(total / limit)

  const pageData: EventLogPageData = {
    events,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      startItem: total === 0 ? 0 : (page - 1) * limit + 1,
      endItem: Math.min(page * limit, total)
    },
    filters,
    user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
    version: c.get('appVersion')
  }

  return c.html(renderEventLogPage(pageData))
})

export { adminRoutes as securityAuditAdminRoutes }
