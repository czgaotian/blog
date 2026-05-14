import { Hono } from 'hono'
import { TurnstileService } from '../plugins/core-plugins/turnstile-plugin/services/turnstile'
import { sanitizeInput } from '@worker-blog/shared/utils/sanitize'
import { createContentFromSubmission } from '../services/form-collection-sync'

/**
 * Recursively sanitize all string values in arbitrary JSON data.
 * HTML-encodes entities (e.g., < becomes &lt;) to prevent stored XSS
 * when form submission data is rendered in admin templates.
 */
function sanitizeDeep(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeInput(value)
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeDeep)
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = sanitizeDeep(v)
    }
    return result
  }
  return value // numbers, booleans, null pass through
}

type Bindings = {
  DB: D1Database
  CACHE_KV: KVNamespace
  MEDIA_BUCKET: R2Bucket
  ASSETS: Fetcher
  EMAIL_QUEUE?: Queue
  SENDGRID_API_KEY?: string
  DEFAULT_FROM_EMAIL?: string
  ENVIRONMENT?: string
  GOOGLE_MAPS_API_KEY?: string
}

type Variables = {
  user?: {
    userId: string
    email: string
    role: string
    exp: number
    iat: number
  }
  requestId?: string
  startTime?: number
  appVersion?: string
}

export const publicFormsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Get Turnstile configuration for a form (for headless frontends)
publicFormsRoutes.get('/:identifier/turnstile-config', async (c) => {
  try {
    const db = c.env.DB
    const identifier = c.req.param('identifier')

    // Get form
    const form = await db.prepare(
      'SELECT id, turnstile_enabled, turnstile_settings FROM forms WHERE (id = ? OR name = ?) AND is_active = 1'
    ).bind(identifier, identifier).first()

    if (!form) {
      return c.json({ error: 'Form not found' }, 404)
    }

    const turnstileService = new TurnstileService(db, c.env as any)
    const globalSettings = await turnstileService.getSettings()
    
    const formSettings = form.turnstile_settings 
      ? JSON.parse(form.turnstile_settings as string)
      : { inherit: true }

    // Determine effective settings
    const enabled = form.turnstile_enabled === 1 || 
                   (formSettings.inherit && globalSettings?.enabled)

    if (!enabled || !globalSettings) {
      return c.json({ enabled: false })
    }

    return c.json({
      enabled: true,
      siteKey: formSettings.siteKey || globalSettings.siteKey,
      theme: formSettings.theme || globalSettings.theme || 'auto',
      size: formSettings.size || globalSettings.size || 'normal',
      mode: formSettings.mode || globalSettings.mode || 'managed',
      appearance: formSettings.appearance || globalSettings.appearance || 'always'
    })
  } catch (error: any) {
    console.error('Error fetching Turnstile config:', error)
    return c.json({ error: 'Failed to fetch config' }, 500)
  }
})

// Get form schema as JSON (for headless frontends)
publicFormsRoutes.get('/:identifier/schema', async (c) => {
  try {
    const db = c.env.DB
    const identifier = c.req.param('identifier')

    // Get form by ID or name
    const form = await db.prepare(
      'SELECT id, name, display_name, description, category, formio_schema, settings, is_active, is_public FROM forms WHERE (id = ? OR name = ?) AND is_active = 1 AND is_public = 1'
    ).bind(identifier, identifier).first()

    if (!form) {
      return c.json({ error: 'Form not found' }, 404)
    }

    const formioSchema = form.formio_schema ? JSON.parse(form.formio_schema as string) : { components: [] }
    const settings = form.settings ? JSON.parse(form.settings as string) : {}

    return c.json({
      id: form.id,
      name: form.name,
      displayName: form.display_name,
      description: form.description,
      category: form.category,
      schema: formioSchema,
      settings: settings,
      submitUrl: `/api/forms/${form.id}/submit`
    })
  } catch (error: any) {
    console.error('Error fetching form schema:', error)
    return c.json({ error: 'Failed to fetch form schema' }, 500)
  }
})

// Handle form submission (accepts either name or ID)
publicFormsRoutes.post('/:identifier/submit', async (c) => {
  try {
    const db = c.env.DB
    const identifier = c.req.param('identifier')
    const body = await c.req.json()

    // Get form by ID or name
    const form = await db.prepare(
      'SELECT * FROM forms WHERE (id = ? OR name = ?) AND is_active = 1'
    ).bind(identifier, identifier).first()

    if (!form) {
      return c.json({ error: 'Form not found' }, 404)
    }

    // Check if Turnstile is enabled for this form
    const turnstileEnabled = form.turnstile_enabled === 1
    const turnstileSettings = form.turnstile_settings 
      ? JSON.parse(form.turnstile_settings as string) 
      : { inherit: true }

    // Validate Turnstile if enabled (or inheriting global settings)
    if (turnstileEnabled || turnstileSettings.inherit) {
      const turnstileService = new TurnstileService(db, c.env as any)
      
      // Check if Turnstile is globally enabled
      const globalEnabled = await turnstileService.isEnabled()
      
      if (globalEnabled || turnstileEnabled) {
        // Extract Turnstile token from submission data
        const turnstileToken = body.data?.turnstile || body.turnstile
        
        if (!turnstileToken) {
          return c.json({ 
            error: 'Turnstile verification required. Please complete the security check.',
            code: 'TURNSTILE_MISSING'
          }, 400)
        }

        // Verify the token
        const clientIp = c.req.header('cf-connecting-ip')
        const verification = await turnstileService.verifyToken(turnstileToken, clientIp)
        
        if (!verification.success) {
          return c.json({ 
            error: verification.error || 'Security verification failed. Please try again.',
            code: 'TURNSTILE_INVALID'
          }, 403)
        }

        // Remove Turnstile token from submission data before storing
        if (body.data?.turnstile) {
          delete body.data.turnstile
        }
      }
    }

    // Sanitize all string values in submission data to prevent stored XSS.
    // HTML-encodes entities (e.g., < becomes &lt;) before storage.
    const sanitizedData = sanitizeDeep(body.data) as Record<string, unknown>

    // Create submission
    const submissionId = crypto.randomUUID()
    const now = Date.now()

    await db.prepare(`
      INSERT INTO form_submissions (
        id, form_id, submission_data, user_id, ip_address, user_agent,
        submitted_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      submissionId,
      form.id,
      JSON.stringify(sanitizedData),
      null, // user_id (for authenticated users)
      c.req.header('cf-connecting-ip') || null,
      c.req.header('user-agent') || null,
      now,
      now
    ).run()

    // Update submission count
    await db.prepare(`
      UPDATE forms
      SET submission_count = submission_count + 1,
          updated_at = ?
      WHERE id = ?
    `).bind(now, form.id).run()

    // Dual-write: create content item for this submission
    let contentId: string | null = null
    try {
      contentId = await createContentFromSubmission(
        db,
        sanitizedData as Record<string, any>,
        { id: form.id as string, name: form.name as string, display_name: form.display_name as string },
        submissionId,
        {
          ipAddress: c.req.header('cf-connecting-ip') || null,
          userAgent: c.req.header('user-agent') || null,
          userEmail: (sanitizedData as any)?.email || null,
          userId: null // anonymous submission
        }
      )
      if (!contentId) {
        console.warn('[FormSubmit] Content creation returned null for submission:', submissionId)
      }
    } catch (contentError) {
      // Don't fail the submission if content creation fails
      console.error('[FormSubmit] Error creating content from submission:', contentError)
    }

    return c.json({
      success: true,
      submissionId,
      contentId,
      message: 'Form submitted successfully'
    })
  } catch (error: any) {
    console.error('Error submitting form:', error)
    return c.json({ error: 'Failed to submit form' }, 500)
  }
})

export default publicFormsRoutes
