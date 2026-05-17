/**
 * Built-in transactional email feature.
 */

import { Hono } from 'hono'

const emailRoutes = new Hono()

// POST /api/admin/email/test - send a test email using env configuration.
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

    const toEmail = body.toEmail || settings.fromEmail

    if (!toEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return c.json({
        success: false,
        error: 'Invalid email address format'
      }, 400)
    }

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
            <h1 style="color: #667eea;">Test Email Successful</h1>
            <p>This is a test email from your Worker Blog email configuration.</p>
            <p><strong>Configuration:</strong></p>
            <ul>
              <li>From: ${settings.fromName} &lt;${settings.fromEmail}&gt;</li>
              <li>Reply-To: ${settings.replyTo || 'Not set'}</li>
              <li>Sent at: ${new Date().toISOString()}</li>
            </ul>
            <p>Your email settings are working correctly.</p>
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

export const emailFeature = {
  routes: [{
    path: '/api/admin/email',
    handler: emailRoutes,
  }],
}
