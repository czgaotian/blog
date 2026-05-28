/**
 * Bootstrap Middleware Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Hono } from 'hono'
import { bootstrapMiddleware, resetBootstrap } from './bootstrap'
import { getBootstrapStatus } from '../services/bootstrap'

vi.mock('../services/migrations', () => {
  const mockRunPendingMigrations = vi.fn().mockResolvedValue(undefined)
  return {
    MigrationService: vi.fn().mockImplementation(function() {
      this.runPendingMigrations = mockRunPendingMigrations
      return this
    })
  }
})

import { MigrationService } from '../services/migrations'

// Create mock environment
function createMockEnv() {
  return {
    DB: {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true })
      })
    },
    CACHE_KV: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined)
    }
  }
}

describe('bootstrapMiddleware', () => {
  let consoleSpy: any
  let errorSpy: any

  beforeEach(() => {
    // Reset bootstrap state before each test
    resetBootstrap()
    vi.clearAllMocks()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('should run bootstrap on first request', async () => {
    const app = new Hono()
    const env = createMockEnv()

    app.use('*', async (c, next) => {
      c.env = env as any
      await next()
    })
    app.use('*', bootstrapMiddleware())
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('/test')

    expect(res.status).toBe(200)
    expect(consoleSpy).toHaveBeenCalledWith('[Bootstrap] Starting system initialization...')
    expect(consoleSpy).toHaveBeenCalledWith('[Bootstrap] System initialization completed')
    expect(MigrationService).toHaveBeenCalled()

    const status = getBootstrapStatus()
    expect(status.complete).toBe(true)
    expect(status.running).toBe(false)
    expect(status.lastStartedAt).toBeDefined()
    expect(status.lastCompletedAt).toBeDefined()
    expect(status.totalDurationMs).toBeGreaterThanOrEqual(0)
    expect(status.steps.map((step) => step.state)).toEqual([
      'success',
      'success',
    ])
  })

  it('should skip automatic bootstrap in manual mode', async () => {
    const app = new Hono()
    const env = { ...createMockEnv(), BOOTSTRAP_MODE: 'manual' }

    app.use('*', async (c, next) => {
      c.env = env as any
      await next()
    })
    app.use('*', bootstrapMiddleware())
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('/test')

    expect(res.status).toBe(200)
    expect(MigrationService).not.toHaveBeenCalled()
    expect(getBootstrapStatus().complete).toBe(false)
  })

  it('should skip automatic bootstrap in disabled mode', async () => {
    const app = new Hono()
    const env = { ...createMockEnv(), BOOTSTRAP_MODE: 'disabled' }

    app.use('*', async (c, next) => {
      c.env = env as any
      await next()
    })
    app.use('*', bootstrapMiddleware())
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('/test')

    expect(res.status).toBe(200)
    expect(MigrationService).not.toHaveBeenCalled()
    expect(getBootstrapStatus().complete).toBe(false)
  })

  it('should skip bootstrap on subsequent requests', async () => {
    const app = new Hono()
    const env = createMockEnv()

    app.use('*', async (c, next) => {
      c.env = env as any
      await next()
    })
    app.use('*', bootstrapMiddleware())
    app.get('/test', (c) => c.json({ ok: true }))

    // First request - runs bootstrap
    await app.request('/test')
    vi.clearAllMocks()

    // Second request - should skip bootstrap
    const res = await app.request('/test')

    expect(res.status).toBe(200)
    expect(consoleSpy).not.toHaveBeenCalledWith('[Bootstrap] Starting system initialization...')
    expect(MigrationService).not.toHaveBeenCalled()
  })

  it('should skip bootstrap for static assets', async () => {
    const app = new Hono()
    const env = createMockEnv()

    app.use('*', async (c, next) => {
      c.env = env as any
      await next()
    })
    app.use('*', bootstrapMiddleware())
    app.get('/images/test.png', (c) => c.json({ ok: true }))
    app.get('/assets/style.css', (c) => c.json({ ok: true }))

    await app.request('/images/test.png')
    expect(MigrationService).not.toHaveBeenCalled()

    await app.request('/assets/style.css')
    expect(MigrationService).not.toHaveBeenCalled()
  })

  it('should skip bootstrap for health check', async () => {
    const app = new Hono()
    const env = createMockEnv()

    app.use('*', async (c, next) => {
      c.env = env as any
      await next()
    })
    app.use('*', bootstrapMiddleware())
    app.get('/health', (c) => c.json({ ok: true }))

    await app.request('/health')
    expect(MigrationService).not.toHaveBeenCalled()
  })

  it('should skip bootstrap for app health check and admin assets', async () => {
    const app = new Hono()
    const env = createMockEnv()

    app.use('*', async (c, next) => {
      c.env = env as any
      await next()
    })
    app.use('*', bootstrapMiddleware())
    app.get('/api/health', (c) => c.json({ ok: true }))
    app.get('/admin/assets/app.js', (c) => c.text('console.log("admin")'))

    await app.request('/api/health')
    expect(MigrationService).not.toHaveBeenCalled()

    await app.request('/admin/assets/app.js')
    expect(MigrationService).not.toHaveBeenCalled()
  })

  it('should skip bootstrap for .js files', async () => {
    const app = new Hono()
    const env = createMockEnv()

    app.use('*', async (c, next) => {
      c.env = env as any
      await next()
    })
    app.use('*', bootstrapMiddleware())
    app.get('/script.js', (c) => c.text('console.log("test")'))

    await app.request('/script.js')
    expect(MigrationService).not.toHaveBeenCalled()
  })

  it('should skip bootstrap for .css files', async () => {
    const app = new Hono()
    const env = createMockEnv()

    app.use('*', async (c, next) => {
      c.env = env as any
      await next()
    })
    app.use('*', bootstrapMiddleware())
    app.get('/style.css', (c) => c.text('body {}'))

    await app.request('/style.css')
    expect(MigrationService).not.toHaveBeenCalled()
  })

  it('should skip bootstrap for .ico files', async () => {
    const app = new Hono()
    const env = createMockEnv()

    app.use('*', async (c, next) => {
      c.env = env as any
      await next()
    })
    app.use('*', bootstrapMiddleware())
    app.get('/favicon.ico', (c) => c.text(''))

    await app.request('/favicon.ico')
    expect(MigrationService).not.toHaveBeenCalled()
  })

  it('should continue on fatal bootstrap error', async () => {
    const app = new Hono()
    const env = createMockEnv()

    // Make MigrationService constructor throw
    vi.mocked(MigrationService).mockImplementationOnce(function() {
      throw new Error('Fatal error')
    } as any)

    app.use('*', async (c, next) => {
      c.env = env as any
      await next()
    })
    app.use('*', bootstrapMiddleware())
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('/test')

    // Should still return 200 - app continues despite bootstrap error
    expect(res.status).toBe(200)
    expect(errorSpy).toHaveBeenCalledWith('[Bootstrap] Error during system initialization:', expect.any(Error))

    const status = getBootstrapStatus()
    expect(status.complete).toBe(false)
    expect(status.lastError).toBe('Fatal error')
    expect(status.steps.find((step) => step.name === 'migrations')).toMatchObject({
      state: 'error',
      error: 'Fatal error'
    })
  })
})

describe('resetBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetBootstrap()
  })

  it('should allow bootstrap to run again after reset', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const app = new Hono()
    const env = createMockEnv()

    app.use('*', async (c, next) => {
      c.env = env as any
      await next()
    })
    app.use('*', bootstrapMiddleware())
    app.get('/test', (c) => c.json({ ok: true }))

    // First request - runs bootstrap
    await app.request('/test')
    expect(MigrationService).toHaveBeenCalledTimes(1)

    // Reset bootstrap
    resetBootstrap()
    vi.clearAllMocks()

    // Second request after reset - should run bootstrap again
    await app.request('/test')
    expect(MigrationService).toHaveBeenCalledTimes(1)

    consoleSpy.mockRestore()
  })
})
