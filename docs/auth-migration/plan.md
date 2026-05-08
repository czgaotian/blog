# Auth Pages React Migration Plan

**Goal:** Replace the two HTMX HTML template renders (`GET /auth/login`, `GET /auth/register`) and their HTMX fragment handlers (`POST /auth/login/form`, `POST /auth/register/form`) with React SPA pages served from the existing admin Vite bundle. Also migrate the inline-HTML `GET /auth/accept-invitation` and `GET /auth/reset-password` pages.

After this migration:
- `auth-login.template.ts` and `auth-register.template.ts` can be deleted.
- The two HTMX form-post endpoints are removed.
- All four auth page routes serve the same SPA shell as `/admin/*`.
- The existing JSON API endpoints (`POST /auth/login`, `POST /auth/register`, etc.) are unchanged — the React pages call them directly.

---

## Current State

| Route | Current behavior |
|-------|-----------------|
| `GET /auth/login` | Renders `renderLoginPage()` from `auth-login.template.ts` (HTMX + CDN Tailwind) |
| `GET /auth/register` | Renders `renderRegisterPage()` from `auth-register.template.ts` (HTMX + CDN Tailwind) |
| `POST /auth/login/form` | HTMX fragment handler — returns inline HTML, sets cookie, redirects |
| `POST /auth/register/form` | HTMX fragment handler — returns inline HTML, sets cookie, redirects |
| `POST /auth/login` | JSON API (already exists, sets cookie) |
| `POST /auth/register` | JSON API (already exists, sets cookie) |
| `GET /auth/accept-invitation` | Inline HTML (no template file) |
| `POST /auth/accept-invitation` | JSON API |
| `POST /auth/request-password-reset` | JSON API |
| `GET /auth/reset-password` | Inline HTML (no template file) |
| `POST /auth/reset-password` | JSON API |

The JSON API endpoints (`POST /auth/login`, `POST /auth/register`, etc.) are already present and correct. The React pages will call these directly — no server-side logic changes are needed for the happy path.

---

## Target Architecture

```
browser GET /auth/login
  → server returns SPA shell (index.html from packages/admin/dist/)
  → React Router matches /auth/login
  → LoginPage renders (AuthLayout — no sidebar)
  → user submits → POST /auth/login (JSON API, already exists)
  → on success: window.location.href = '/admin/dashboard'
```

Auth pages live inside the **existing** admin SPA bundle — same Vite build, same Tailwind/shadcn/ui. No second bundle needed.

Router structure after migration:

```
app.tsx root
  /auth/*  → AuthLayout (centered, no sidebar)
    /auth/login
    /auth/register
    /auth/accept-invitation
    /auth/reset-password
  /admin/* → AdminLayout (sidebar + topbar, existing)
    /admin/dashboard
    ...
```

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `packages/shared/src/admin-api/auth.ts` | Add `LoginRequest`, `LoginResponse`, `RegisterRequest`, `RegisterResponse`, `AcceptInvitationRequest`, `RequestPasswordResetRequest`, `ResetPasswordRequest` types + Zod schemas |
| Modify | `packages/shared/src/admin-api/index.ts` | Re-export `./auth` |
| Create | `packages/admin/src/spa/layouts/auth-layout.tsx` | Centered layout for auth pages (no sidebar) |
| Create | `packages/admin/src/spa/api/auth.ts` | React Query / mutation hooks wrapping the existing JSON auth endpoints |
| Create | `packages/admin/src/spa/pages/auth/login.tsx` | Login page |
| Create | `packages/admin/src/spa/pages/auth/register.tsx` | Register page |
| Create | `packages/admin/src/spa/pages/auth/accept-invitation.tsx` | Accept invitation page (reads `?token=` from URL) |
| Create | `packages/admin/src/spa/pages/auth/reset-password.tsx` | Reset password page (reads `?token=` from URL, also has request-reset flow) |
| Modify | `packages/admin/src/spa/router.tsx` | Add `/auth/*` routes under `AuthLayout` |
| Modify | `packages/server/src/routes/auth.ts` | Replace `GET /auth/login` and `GET /auth/register` with SPA shell; remove `POST /auth/login/form` and `POST /auth/register/form`; replace inline-HTML `GET /accept-invitation` and `GET /reset-password` with SPA shell |
| Delete | `packages/admin/src/templates/pages/auth-login.template.ts` | No longer used |
| Delete | `packages/admin/src/templates/pages/auth-register.template.ts` | No longer used |

---

## Task 1: Shared auth types

**File:** `packages/shared/src/admin-api/auth.ts`

Check if the file already exists. If not, create it. Add:

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginRequest = z.infer<typeof loginSchema>

export interface LoginResponse {
  user: {
    id: string
    email: string
    username: string
    firstName: string
    lastName: string
    role: string
  }
  token: string
}

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
})
export type RegisterRequest = z.infer<typeof registerSchema>

export interface RegisterResponse {
  user: {
    id: string
    email: string
    role: string
  }
  token: string
}

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  username: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
})
export type AcceptInvitationRequest = z.infer<typeof acceptInvitationSchema>

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
})
export type RequestPasswordResetRequest = z.infer<typeof requestPasswordResetSchema>

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  confirmPassword: z.string().min(1),
})
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>
```

Then add to `packages/shared/src/admin-api/index.ts`:

```typescript
export * from './auth'
```

Verify:
```bash
pnpm --filter shared type-check 2>&1 | tail -5
```

---

## Task 2: Auth API hooks

**File:** `packages/admin/src/spa/api/auth.ts`

The hooks call the **existing** JSON endpoints — no new server routes needed.

```typescript
import { useMutation } from '@tanstack/react-query'
import type {
  LoginRequest, LoginResponse,
  RegisterRequest, RegisterResponse,
  AcceptInvitationRequest,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function useLogin() {
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (data) =>
      adminFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

export function useRegister() {
  return useMutation<RegisterResponse, Error, RegisterRequest>({
    mutationFn: (data) =>
      adminFetch<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

export function useAcceptInvitation() {
  return useMutation<{ message: string }, Error, AcceptInvitationRequest>({
    mutationFn: (data) =>
      adminFetch('/auth/accept-invitation', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

export function useRequestPasswordReset() {
  return useMutation<{ message: string }, Error, RequestPasswordResetRequest>({
    mutationFn: (data) =>
      adminFetch('/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

export function useResetPassword() {
  return useMutation<{ message: string }, Error, ResetPasswordRequest>({
    mutationFn: (data) =>
      adminFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}
```

Note: `adminFetch` already handles `credentials: 'same-origin'` and CSRF headers. Auth mutations are unauthenticated so CSRF is not needed for login/register (no existing cookie), but it doesn't hurt to pass the header if the cookie is present.

---

## Task 3: AuthLayout

**File:** `packages/admin/src/spa/layouts/auth-layout.tsx`

A minimal centered layout — no sidebar, no topbar. Uses the same Tailwind tokens as the admin layout so dark mode works automatically.

```tsx
import { Outlet } from 'react-router'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <Outlet />
    </div>
  )
}
```

---

## Task 4: Login page

**File:** `packages/admin/src/spa/pages/auth/login.tsx`

Calls `POST /auth/login` (JSON). On success, redirects to `/admin/dashboard` via `window.location.href` (full navigation, not React Router, so the admin SPA re-initialises with the new cookie).

```tsx
import { useState } from 'react'
import { Link } from 'react-router'
import { useLogin } from '../../api/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Alert } from '../../components/ui/alert'
import { AdminApiError } from '../../api/client'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await login.mutateAsync({ email, password })
      window.location.href = '/admin/dashboard'
    } catch {
      // error shown via login.error below
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Logo / branding */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {login.isError && (
          <Alert title="Sign in failed" tone="danger">
            {login.error instanceof AdminApiError ? login.error.message : 'Unexpected error'}
          </Alert>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground space-y-2">
        <div>
          <Link to="/auth/reset-password" className="hover:text-foreground underline underline-offset-4">
            Forgot password?
          </Link>
        </div>
        <div>
          Don't have an account?{' '}
          <Link to="/auth/register" className="hover:text-foreground underline underline-offset-4">
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}
```

---

## Task 5: Register page

**File:** `packages/admin/src/spa/pages/auth/register.tsx`

Calls `POST /auth/register` (JSON). Before rendering, check `GET /auth/register` status — if registration is disabled the server returns a redirect (or 403). The React page can just attempt registration and handle the error.

```tsx
import { useState } from 'react'
import { Link } from 'react-router'
import { useRegister } from '../../api/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Alert } from '../../components/ui/alert'
import { AdminApiError } from '../../api/client'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const register = useRegister()
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await register.mutateAsync({ email, password, firstName, lastName })
      setDone(true)
      setTimeout(() => { window.location.href = '/admin/dashboard' }, 1500)
    } catch {
      // shown via register.error
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm text-muted-foreground">Get started with Worker Blog</p>
      </div>

      {done ? (
        <Alert title="Account created" tone="success">Redirecting to dashboard…</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {register.isError && (
            <Alert title="Registration failed" tone="danger">
              {register.error instanceof AdminApiError ? register.error.message : 'Unexpected error'}
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>

          <Button type="submit" className="w-full" disabled={register.isPending}>
            {register.isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      )}

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/auth/login" className="hover:text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </div>
  )
}
```

---

## Task 6: Accept invitation page

**File:** `packages/admin/src/spa/pages/auth/accept-invitation.tsx`

Reads `?token=` from the URL. Calls `POST /auth/accept-invitation`.

```tsx
import { useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import { useAcceptInvitation } from '../../api/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Alert } from '../../components/ui/alert'
import { AdminApiError } from '../../api/client'

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const accept = useAcceptInvitation()
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <Alert title="Invalid invitation" tone="danger">
          This invitation link is invalid or has expired.
        </Alert>
        <Link to="/auth/login" className="text-sm underline underline-offset-4">
          Go to login
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) return
    try {
      await accept.mutateAsync({ token, password })
      setDone(true)
      setTimeout(() => { window.location.href = '/admin/dashboard' }, 1500)
    } catch {
      // shown via accept.error
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Accept invitation</h1>
        <p className="text-sm text-muted-foreground">Set a password to activate your account</p>
      </div>

      {done ? (
        <Alert title="Account activated" tone="success">Redirecting to dashboard…</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {accept.isError && (
            <Alert title="Failed" tone="danger">
              {accept.error instanceof AdminApiError ? accept.error.message : 'Unexpected error'}
            </Alert>
          )}
          {password !== confirm && confirm.length > 0 && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>

          <Button type="submit" className="w-full" disabled={accept.isPending || password !== confirm}>
            {accept.isPending ? 'Activating…' : 'Activate account'}
          </Button>
        </form>
      )}
    </div>
  )
}
```

---

## Task 7: Reset password page

**File:** `packages/admin/src/spa/pages/auth/reset-password.tsx`

Two modes in one component:
1. No `?token=` → show "request reset" form (calls `POST /auth/request-password-reset`)
2. `?token=...` → show "enter new password" form (calls `POST /auth/reset-password`)

```tsx
import { useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import { useRequestPasswordReset, useResetPassword } from '../../api/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Alert } from '../../components/ui/alert'
import { AdminApiError } from '../../api/client'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  return token ? <ResetForm token={token} /> : <RequestForm />
}

function RequestForm() {
  const [email, setEmail] = useState('')
  const request = useRequestPasswordReset()
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await request.mutateAsync({ email })
    setDone(true)
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="text-sm text-muted-foreground">Enter your email and we'll send a reset link</p>
      </div>

      {done ? (
        <Alert title="Email sent" tone="success">
          If an account exists for that email, a reset link has been sent.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {request.isError && (
            <Alert title="Failed" tone="danger">
              {request.error instanceof AdminApiError ? request.error.message : 'Unexpected error'}
            </Alert>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={request.isPending}>
            {request.isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}

      <div className="text-center text-sm">
        <Link to="/auth/login" className="text-muted-foreground hover:text-foreground underline underline-offset-4">
          Back to login
        </Link>
      </div>
    </div>
  )
}

function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const reset = useResetPassword()
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) return
    try {
      await reset.mutateAsync({ token, password, confirmPassword: confirm })
      setDone(true)
      setTimeout(() => { window.location.href = '/auth/login?message=Password+reset+successfully' }, 1500)
    } catch {
      // shown via reset.error
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
        <p className="text-sm text-muted-foreground">Choose a strong password for your account</p>
      </div>

      {done ? (
        <Alert title="Password reset" tone="success">Redirecting to login…</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {reset.isError && (
            <Alert title="Reset failed" tone="danger">
              {reset.error instanceof AdminApiError ? reset.error.message : 'Unexpected error'}
            </Alert>
          )}
          {password !== confirm && confirm.length > 0 && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={reset.isPending || password !== confirm}>
            {reset.isPending ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
      )}
    </div>
  )
}
```

---

## Task 8: Wire auth routes into router.tsx

**File:** `packages/admin/src/spa/router.tsx`

Read the current file first. Add `AuthLayout` and auth page imports, then add an `/auth` route block parallel to the existing `/admin` route block.

The router structure becomes:

```tsx
import { AuthLayout } from './layouts/auth-layout'
import { LoginPage } from './pages/auth/login'
import { RegisterPage } from './pages/auth/register'
import { AcceptInvitationPage } from './pages/auth/accept-invitation'
import { ResetPasswordPage } from './pages/auth/reset-password'

// Add alongside the existing admin routes:
{
  path: '/auth',
  element: <AuthLayout />,
  children: [
    { path: 'login', element: <LoginPage /> },
    { path: 'register', element: <RegisterPage /> },
    { path: 'accept-invitation', element: <AcceptInvitationPage /> },
    { path: 'reset-password', element: <ResetPasswordPage /> },
  ],
},
```

Note: Verify exact router API used in the file (array of route objects vs `createBrowserRouter` vs JSX `<Routes>`). Match the existing pattern.

---

## Task 9: Server — serve SPA shell for auth routes

**File:** `packages/server/src/routes/auth.ts`

### 9a. Remove template imports

Delete lines 7–8:

```typescript
// DELETE:
import { renderLoginPage, LoginPageData } from '@worker-blog/admin/templates/pages/auth-login.template'
import { renderRegisterPage, RegisterPageData } from '@worker-blog/admin/templates/pages/auth-register.template'
```

Also delete the `LoginPageData` and `RegisterPageData` type usages later in the file.

### 9b. Replace `GET /auth/login` handler

Replace the body of `authRoutes.get('/login', ...)` with an SPA shell response. The SPA shell helper is already in the codebase at `admin-spa.ts`. Import and use it:

```typescript
import { serveAdminSpaShell } from './admin-spa'

authRoutes.get('/login', async (c) => {
  return serveAdminSpaShell(c)
})
```

If `serveAdminSpaShell` takes the request's URL or needs env, check its signature in `packages/server/src/routes/admin-spa.ts` and adapt.

### 9c. Replace `GET /auth/register` handler

Same pattern:

```typescript
authRoutes.get('/register', async (c) => {
  return serveAdminSpaShell(c)
})
```

The registration-disabled check currently lives here. Move the guard: add a `GET /auth/api/register-status` JSON endpoint (or check inline) — but the simplest approach is to let the React `RegisterPage` attempt `POST /auth/register` and handle the 403/disabled error response. Remove the server-side redirect guard from `GET /auth/register`.

### 9d. Remove HTMX form endpoints

Delete `authRoutes.post('/register/form', ...)` (lines 453–602) and `authRoutes.post('/login/form', ...)` (lines 605–711). These are only needed by the HTMX templates being removed.

### 9e. Replace inline-HTML GET handlers for invitation and reset

```typescript
authRoutes.get('/accept-invitation', async (c) => {
  return serveAdminSpaShell(c)
})

authRoutes.get('/reset-password', async (c) => {
  return serveAdminSpaShell(c)
})
```

The token validation (checking DB for valid/expired tokens) currently happens inside these GET handlers and returns inline HTML error pages. After migration, token validation happens only in the POST handlers (`POST /auth/accept-invitation`, `POST /auth/reset-password`) which return JSON errors. The React pages display those errors.

---

## Task 10: Delete auth templates

```bash
rm packages/admin/src/templates/pages/auth-login.template.ts
rm packages/admin/src/templates/pages/auth-register.template.ts
```

Then run:

```bash
grep -r "auth-login.template\|auth-register.template" packages/ --include="*.ts" --include="*.tsx"
```

Expected: no results.

---

## Task 11: Verification

```bash
pnpm type-check
pnpm --filter @worker-blog/admin build
pnpm --filter @worker-blog/server test
```

Manual checks (requires `pnpm dev`):

- [ ] `GET /auth/login` returns SPA shell (check `Content-Type: text/html` with `<div id="admin-root">`)
- [ ] Browser navigates to `/auth/login` and React login form renders
- [ ] Submitting wrong credentials shows error message in-page (no full page reload)
- [ ] Successful login redirects to `/admin/dashboard`
- [ ] `GET /auth/register` returns SPA shell and React register form renders
- [ ] `GET /auth/reset-password` (no token) renders request-reset form
- [ ] `GET /auth/reset-password?token=...` renders set-new-password form
- [ ] `GET /auth/accept-invitation?token=...` renders accept form
- [ ] Dark mode works on auth pages (same Tailwind tokens as admin)
- [ ] `GET /auth/api/*` and `POST /auth/*` API routes are NOT swallowed by the shell (priority correct)
- [ ] `POST /auth/login/form` returns 404 (removed)
- [ ] `POST /auth/register/form` returns 404 (removed)

---

## Risks and Notes

**SPA shell at `/auth/*`:** The `serveAdminSpaShell` helper was written for `/admin/*`. Verify it doesn't enforce an admin-only check or redirect unauthenticated requests back to `/auth/login` (that would cause a loop). If it does, extract a lower-level `serveSpaShell(c)` function used by both.

**Registration guard:** The current `GET /auth/register` server handler redirects to `/auth/login?error=...` when registration is disabled. After migration this guard is removed. The React page will fail when it attempts `POST /auth/register` and get back a 403 — handle this error in `RegisterPage`. Alternatively, add a `GET /auth/api/register-status` endpoint returning `{ registrationEnabled: boolean }` so the page can show a disabled message before the user tries to submit.

**Demo login plugin:** `GET /auth/login` currently queries DB for the `demo-login-prefill` plugin and passes a flag to the template. After migration, add `GET /auth/api/login-config` returning `{ demoLoginActive: boolean }` and use it in `LoginPage` to optionally prefill credentials.

**Invitation token expiry display:** The old `GET /accept-invitation` showed styled error pages for expired/invalid tokens before the form. The React page shows a generic invalid-token message before attempting submit. This is acceptable — the POST handler returns clear error messages.

**`/auth/logout` GET redirect:** This still redirects to `/auth/login?message=...` — that URL now serves the SPA, which works. The `message` query param is currently passed to the template; update `LoginPage` to read `useSearchParams().get('message')` and display it.
