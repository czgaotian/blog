/**
 * Email Plugin
 *
 * Send transactional emails using Resend
 * Handles registration, verification, password reset, and one-time codes
 */

import { Hono } from 'hono'
import { PluginBuilder } from '../../sdk/plugin-builder'
import type { Plugin } from '@worker-blog/shared/types/plugin'

export function createEmailPlugin(): Plugin {
  const builder = PluginBuilder.create({
    name: 'email',
    version: '1.0.0-beta.1',
    description: 'Send transactional emails using Resend'
  })

  // Add plugin metadata
  builder.metadata({
    author: {
      name: 'Worker Blog Team',
      email: 'team@worker-blog.com'
    },
    license: 'MIT',
    compatibility: '^2.0.0'
  })

  const emailRoutes = new Hono()

  // POST endpoint for test email
  emailRoutes.post('/test', async (c: any) => {
    try {
      const body = await c.req.json()

      const settings = {
        apiKey: c.env.RESEND_API_KEY || c.env.SENDGRID_API_KEY || '',
        fromEmail: c.env.DEFAULT_FROM_EMAIL || '',
        fromName: c.env.DEFAULT_FROM_NAME || 'Worker Blog',
        replyTo: c.env.DEFAULT_FROM_EMAIL || '',
      }

      if (!settings.apiKey || !settings.fromEmail || !settings.fromName) {
        return c.json({
          success: false,
          error: 'Missing required email environment variables.'
        }, 400)
      }

      // Use provided email or fallback to fromEmail
      const toEmail = body.toEmail || settings.fromEmail

      // Validate email format
      if (!toEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return c.json({
          success: false,
          error: 'Invalid email address format'
        }, 400)
      }

      // Send test email via Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${settings.fromName} <${settings.fromEmail}>`,
          to: [toEmail],
          subject: 'Test Email from Worker Blog',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #667eea;">Test Email Successful! 🎉</h1>
              <p>This is a test email from your Worker Blog Email plugin.</p>
              <p><strong>Configuration:</strong></p>
              <ul>
                <li>From: ${settings.fromName} &lt;${settings.fromEmail}&gt;</li>
                <li>Reply-To: ${settings.replyTo || 'Not set'}</li>
                <li>Sent at: ${new Date().toISOString()}</li>
              </ul>
              <p>Your email settings are working correctly!</p>
            </div>
          `,
          reply_to: settings.replyTo || settings.fromEmail
        })
      })

      const data = await response.json() as any

      if (!response.ok) {
        console.error('Resend API error:', data)
        return c.json({
          success: false,
          error: data.message || 'Failed to send test email. Check your API key and domain verification.'
        }, response.status)
      }

      return c.json({
        success: true,
        message: `Test email sent successfully to ${toEmail}`,
        emailId: data.id
      })

    } catch (error: any) {
      console.error('Test email error:', error)
      return c.json({
        success: false,
        error: error.message || 'An error occurred while sending test email'
      }, 500)
    }
  })

  // Register the route
  builder.addRoute('/admin/plugins/email', emailRoutes, {
    description: 'Email plugin settings',
    requiresAuth: true,
    priority: 80
  })

  // Add menu item (points to generic plugin settings page)
  builder.addMenuItem('Email', '/admin/plugins/email', {
    icon: 'envelope',
    order: 80,
    permissions: ['email:manage']
  })

  // Add lifecycle hooks
  builder.lifecycle({
    activate: async () => {
      console.info('✅ Email plugin activated')
    },

    deactivate: async () => {
      console.info('❌ Email plugin deactivated')
    }
  })

  return builder.build() as Plugin
}

// Export the plugin instance
export const emailPlugin = createEmailPlugin()
