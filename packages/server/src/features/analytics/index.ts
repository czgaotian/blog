/**
 * Built-in analytics feature.
 */

import { Hono } from 'hono'
import analyticsAdminApiRoutes from './routes/admin-api'

const analyticsAPI = new Hono()

analyticsAPI.get('/stats', async (c) => {
  const timeRange = c.req.query('range') || '7d'

  return c.json({
    message: 'Analytics stats',
    data: {
      pageviews: 12500,
      uniqueVisitors: 3200,
      sessions: 4800,
      avgSessionDuration: 245,
      bounceRate: 0.35,
      topPages: [
        { path: '/', views: 3200 },
        { path: '/about', views: 1800 },
        { path: '/contact', views: 950 }
      ],
      timeRange
    }
  })
})

analyticsAPI.post('/track', async (c) => {
  const event = await c.req.json()
  console.info('Analytics event tracked:', event)

  return c.json({
    message: 'Event tracked successfully',
    eventId: `event-${Date.now()}`
  })
})

analyticsAPI.get('/reports', async (c) => {
  const reportType = c.req.query('type') || 'traffic'
  const startDate = c.req.query('start')
  const endDate = c.req.query('end')

  return c.json({
    message: 'Analytics report',
    data: {
      reportType,
      dateRange: { start: startDate, end: endDate },
      data: []
    }
  })
})

analyticsAPI.get('/realtime', async (c) => {
  return c.json({
    message: 'Real-time analytics',
    data: {
      activeUsers: 23,
      activePages: [
        { path: '/', users: 8 },
        { path: '/blog', users: 5 },
        { path: '/products', users: 4 }
      ],
      recentEvents: []
    }
  })
})

export const analyticsFeature = {
  routes: [
    {
      path: '/api/analytics',
      handler: analyticsAPI,
    },
    {
      path: '/api/admin/analytics',
      handler: analyticsAdminApiRoutes as any,
    },
  ],
}
