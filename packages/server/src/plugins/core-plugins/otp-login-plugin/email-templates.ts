/**
 * OTP Email Templates
 * HTML and plain text templates for OTP codes
 */

export interface OTPEmailData {
  code: string
  expiryMinutes: number
  codeLength: number
  maxAttempts: number
  email: string
  ipAddress?: string
  timestamp: string
  appName: string
  logoUrl?: string
  logoWidth?: number
  logoBorderWidth?: number
  logoBorderColor?: string
  loginUrl?: string
  loginButtonText?: string
}

function sanitizeColor(value?: string): string {
  if (!value) return ''
  // Allow #rgb, #rrggbb, #rrggbbaa, named colors, rgb()/rgba()/hsl()/hsla()
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value
  if (/^[a-zA-Z]+$/.test(value)) return value
  if (/^(rgb|rgba|hsl|hsla)\([0-9.,\s%]+\)$/.test(value)) return value
  return ''
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function renderOTPEmailHTML(data: OTPEmailData): string {
  const logoUrl = data.logoUrl ? escapeHtml(data.logoUrl) : ''
  const loginUrl = data.loginUrl ? escapeHtml(data.loginUrl) : ''
  const appName = escapeHtml(data.appName)
  const loginButtonText = escapeHtml(
    (data.loginButtonText && data.loginButtonText.trim()) || `Sign in to ${data.appName}`
  )
  const logoWidth = Math.max(20, Math.min(600, Number(data.logoWidth) || 150))
  const logoBorderWidth = Math.max(0, Math.min(20, Number(data.logoBorderWidth) || 0))
  const logoBorderColor = sanitizeColor(data.logoBorderColor)
  const logoBorderStyle = logoBorderWidth > 0 && logoBorderColor
    ? `border: ${logoBorderWidth}px solid ${logoBorderColor}; border-radius: 8px;`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">

  <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

    ${logoUrl ? `
    <div style="text-align: center; padding: 30px 20px 20px;">
      <img src="${logoUrl}" alt="${appName}" style="max-width: ${logoWidth}px; width: 100%; height: auto; ${logoBorderStyle}">
    </div>
    ` : ''}

    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0 0 10px 0; font-size: 32px; font-weight: 600;">Your Login Code</h1>
      <p style="margin: 0; opacity: 0.95; font-size: 16px;">Enter this code to sign in to ${appName}</p>
    </div>

    <div style="padding: 40px 30px;">
      <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
        <div style="font-size: 56px; font-weight: bold; letter-spacing: 12px; color: #667eea; font-family: 'Courier New', Courier, monospace; line-height: 1;">
          ${data.code}
        </div>
      </div>

      ${loginUrl ? `
      <div style="text-align: center; margin: 0 0 30px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          ${loginButtonText}
        </a>
      </div>
      ` : ''}

      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px 20px; margin: 0 0 30px 0; border-radius: 6px;">
        <p style="margin: 0; font-size: 14px; color: #856404;">
          <strong>⚠️ This code expires in ${data.expiryMinutes} minutes</strong>
        </p>
      </div>

      <div style="margin: 0 0 30px 0;">
        <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Quick Tips:</h3>
        <ul style="color: #666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Enter the code exactly as shown (${data.codeLength} digits)</li>
          <li>The code can only be used once</li>
          <li>You have ${data.maxAttempts} attempts to enter the correct code</li>
          <li>Request a new code if this one expires</li>
        </ul>
      </div>

      <div style="background: #e8f4ff; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #0066cc; font-weight: 600;">
          🔒 Security Notice
        </p>
        <p style="margin: 0; font-size: 13px; color: #004080; line-height: 1.6;">
          Never share this code with anyone. ${appName} will never ask you for this code via phone, email, or social media.
        </p>
      </div>
    </div>

    <div style="border-top: 1px solid #eee; padding: 30px; background: #f8f9fa;">
      <p style="margin: 0 0 15px 0; font-size: 14px; color: #666; text-align: center;">
        <strong>Didn't request this code?</strong><br>
        Someone may have entered your email by mistake. You can safely ignore this email.
      </p>

      <div style="text-align: center; color: #999; font-size: 12px; line-height: 1.6;">
        <p style="margin: 5px 0;">This email was sent to ${escapeHtml(data.email)}</p>
        ${data.ipAddress ? `<p style="margin: 5px 0;">IP Address: ${escapeHtml(data.ipAddress)}</p>` : ''}
        <p style="margin: 5px 0;">Time: ${escapeHtml(data.timestamp)}</p>
      </div>
    </div>

  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
  </div>

</body>
</html>`
}

export function renderOTPEmailText(data: OTPEmailData): string {
  const ctaLabel = (data.loginButtonText && data.loginButtonText.trim()) || `Sign in to ${data.appName}`
  return `Your Login Code for ${data.appName}

Your one-time verification code is:

${data.code}

This code expires in ${data.expiryMinutes} minutes.
${data.loginUrl ? `\n${ctaLabel}: ${data.loginUrl}\n` : ''}

Quick Tips:
• Enter the code exactly as shown (${data.codeLength} digits)
• The code can only be used once
• You have ${data.maxAttempts} attempts to enter the correct code
• Request a new code if this one expires

Security Notice:
Never share this code with anyone. ${data.appName} will never ask you for this code via phone, email, or social media.

Didn't request this code?
Someone may have entered your email by mistake. You can safely ignore this email.

---
This email was sent to ${data.email}
${data.ipAddress ? `IP Address: ${data.ipAddress}` : ''}
Time: ${data.timestamp}

© ${new Date().getFullYear()} ${data.appName}. All rights reserved.`
}

export function renderOTPEmail(data: OTPEmailData): { html: string; text: string } {
  return {
    html: renderOTPEmailHTML(data),
    text: renderOTPEmailText(data)
  }
}
