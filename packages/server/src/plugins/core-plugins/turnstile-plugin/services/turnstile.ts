import type { D1Database } from '@cloudflare/workers-types'
export interface TurnstileSettings {
  siteKey: string
  secretKey: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  mode?: 'managed' | 'non-interactive' | 'invisible'
  appearance?: 'always' | 'execute' | 'interaction-only'
  preClearance?: boolean
  preClearanceLevel?: 'interactive' | 'managed' | 'non-interactive'
  enabled: boolean
}

export interface TurnstileVerificationResponse {
  success: boolean
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'error-codes'?: string[] // Cloudflare API uses kebab-case for this field
  challenge_ts?: string
  hostname?: string
}

export class TurnstileService {
  private readonly VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

  constructor(_db: D1Database, private env?: Record<string, string | undefined>) {
  }

  /**
   * Get built-in Turnstile settings from environment variables.
   */
  async getSettings(): Promise<TurnstileSettings | null> {
    const siteKey = this.env?.TURNSTILE_SITE_KEY
    const secretKey = this.env?.TURNSTILE_SECRET_KEY
    if (!siteKey || !secretKey) {
      return null
    }
    return {
      siteKey,
      secretKey,
      theme: 'auto',
      size: 'normal',
      mode: 'managed',
      appearance: 'always',
      enabled: true,
    }
  }

  /**
   * Verify a Turnstile token with Cloudflare
   */
  async verifyToken(token: string, remoteIp?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = await this.getSettings()

      if (!settings) {
        return { success: false, error: 'Turnstile not configured' }
      }

      if (!settings.enabled) {
        // Turnstile disabled, allow through
        return { success: true }
      }

      if (!settings.secretKey) {
        return { success: false, error: 'Turnstile secret key not configured' }
      }

      const formData = new FormData()
      formData.append('secret', settings.secretKey)
      formData.append('response', token)
      if (remoteIp) {
        formData.append('remoteip', remoteIp)
      }

      const response = await fetch(this.VERIFY_URL, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        return { success: false, error: 'Turnstile verification request failed' }
      }

      const result = await response.json() as TurnstileVerificationResponse

      if (!result.success) {
        const errorCode = result['error-codes']?.[0] || 'unknown-error'
        return { success: false, error: `Turnstile verification failed: ${errorCode}` }
      }

      return { success: true }
    } catch (error) {
      console.error('Error verifying Turnstile token:', error)
      return { success: false, error: 'Turnstile verification error' }
    }
  }

  /**
   * Check if Turnstile is enabled
   */
  async isEnabled(): Promise<boolean> {
    const settings = await this.getSettings()
    return settings?.enabled === true && !!settings.siteKey && !!settings.secretKey
  }
}
