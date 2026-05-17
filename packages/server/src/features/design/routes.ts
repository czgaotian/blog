import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
}

type Variables = {
  user: {
    userId: string
    email: string
    role: string
  }
  appVersion?: string
}

export const designRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderDesignPage(data: { user?: { email: string; role: string }; version?: string }): string {
  const userLabel = data.user ? `${escapeHtml(data.user.email)} · ${escapeHtml(data.user.role)}` : 'Not signed in'
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Design · Worker Blog</title>
    <style>
      :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      body { margin: 0; background: #09090b; color: #fafafa; }
      main { max-width: 960px; margin: 0 auto; padding: 40px 24px; }
      .panel { border: 1px solid #27272a; border-radius: 8px; padding: 24px; background: #18181b; }
      .muted { color: #a1a1aa; }
      .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-top: 24px; }
      .swatch { min-height: 88px; border-radius: 8px; padding: 12px; border: 1px solid #3f3f46; }
      a { color: #93c5fd; }
    </style>
  </head>
  <body>
    <main>
      <div class="panel">
        <p class="muted">${userLabel}${data.version ? ` · ${escapeHtml(data.version)}` : ''}</p>
        <h1>Design</h1>
        <p class="muted">Legacy design reference page retained without admin template dependencies.</p>
        <div class="grid">
          <div class="swatch" style="background:#18181b">Surface</div>
          <div class="swatch" style="background:#2563eb">Primary</div>
          <div class="swatch" style="background:#16a34a">Success</div>
          <div class="swatch" style="background:#dc2626">Danger</div>
        </div>
        <p class="muted" style="margin-top:24px"><a href="/admin/dashboard">Back to admin</a></p>
      </div>
    </main>
  </body>
</html>`
}

designRoutes.get('/', (c) => {
  const user = c.get('user')

  const pageData = {
    user: user ? {
      email: user.email,
      role: user.role
    } : undefined,
    version: c.get('appVersion')
  }

  return c.html(renderDesignPage(pageData))
})
