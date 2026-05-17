import { Hono } from 'hono'
import { SeedDataService } from './services/seed-data-service'

type Bindings = {
  DB: D1Database
}

export function createSeedDataAdminRoutes() {
  const routes = new Hono<{ Bindings: Bindings }>()

  // Get seed data status/info
  routes.get('/', async (c) => {
    return c.json({
      success: true,
      endpoints: {
        generate: '/api/admin/seed-data/generate',
        clear: '/api/admin/seed-data/clear',
      },
    })
  })

  // Generate seed data
  routes.post('/generate', async (c) => {
    try {
      const db = c.env.DB
      const seedService = new SeedDataService(db)

      const result = await seedService.seedAll()

      return c.json({
        success: true,
        users: result.users,
        content: result.content
      })
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 500)
    }
  })

  // Clear seed data
  routes.post('/clear', async (c) => {
    try {
      const db = c.env.DB
      const seedService = new SeedDataService(db)

      await seedService.clearSeedData()

      return c.json({
        success: true
      })
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 500)
    }
  })

  return routes
}
