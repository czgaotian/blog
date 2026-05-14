import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TurnstileService } from '../services/turnstile'
import type { D1Database } from '@cloudflare/workers-types'

// Mock D1 Database
const createMockDb = () => {
  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...args: any[]) => ({
        first: vi.fn(),
        run: vi.fn(),
      })),
    })),
  } as unknown as D1Database
}

// Mock fetch globally
global.fetch = vi.fn()

describe('TurnstileService', () => {
  let db: D1Database
  let turnstileService: TurnstileService
  const env = {
    TURNSTILE_SITE_KEY: 'test-site-key',
    TURNSTILE_SECRET_KEY: 'test-secret-key',
  }

  beforeEach(() => {
    db = createMockDb()
    turnstileService = new TurnstileService(db, env)
    vi.clearAllMocks()
  })

  describe('getSettings', () => {
    it('should return null when env keys are missing', async () => {
      turnstileService = new TurnstileService(db)

      const settings = await turnstileService.getSettings()
      expect(settings).toBeNull()
      expect(db.prepare).not.toHaveBeenCalled()
    })

    it('should return built-in settings from env', async () => {
      const settings = await turnstileService.getSettings()
      expect(settings).toEqual({
        siteKey: 'test-site-key',
        secretKey: 'test-secret-key',
        theme: 'auto',
        size: 'normal',
        mode: 'managed',
        appearance: 'always',
        enabled: true,
      })
      expect(db.prepare).not.toHaveBeenCalled()
    })
  })

  describe('verifyToken', () => {
    it('should return error when Turnstile is not configured', async () => {
      turnstileService = new TurnstileService(db)

      const result = await turnstileService.verifyToken('test-token')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Turnstile not configured')
    })

    it('should verify token successfully with Cloudflare API', async () => {
      // Mock successful Cloudflare API response
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          challenge_ts: '2024-01-01T00:00:00Z',
          hostname: 'example.com',
        }),
      })

      const result = await turnstileService.verifyToken('valid-token')
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should handle verification failure with error codes', async () => {
      // Mock failed Cloudflare API response
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          'error-codes': ['invalid-input-response'],
        }),
      })

      const result = await turnstileService.verifyToken('invalid-token')
      expect(result.success).toBe(false)
      expect(result.error).toContain('invalid-input-response')
    })

    it('should include remoteip when provided', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const remoteIp = '192.168.1.1'
      await turnstileService.verifyToken('test-token', remoteIp)

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      const formData = fetchCall[1].body as FormData
      expect(formData.get('remoteip')).toBe(remoteIp)
    })

    it('should use correct Cloudflare API endpoint', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await turnstileService.verifyToken('test-token')

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(fetchCall[0]).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
      expect(fetchCall[1].method).toBe('POST')
    })

    it('should handle network errors gracefully', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      )

      const result = await turnstileService.verifyToken('test-token')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Turnstile verification error')
    })
  })

  describe('isEnabled', () => {
    it('should return false when env keys are missing', async () => {
      turnstileService = new TurnstileService(db)

      const result = await turnstileService.isEnabled()
      expect(result).toBe(false)
    })

    it('should return false when keys are missing', async () => {
      turnstileService = new TurnstileService(db, {
        TURNSTILE_SITE_KEY: '',
        TURNSTILE_SECRET_KEY: '',
      })

      const result = await turnstileService.isEnabled()
      expect(result).toBe(false)
    })

    it('should return true when properly configured and enabled', async () => {
      const result = await turnstileService.isEnabled()
      expect(result).toBe(true)
    })
  })
})
