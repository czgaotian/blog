import { Hono, type Context } from 'hono'
// import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getCookie, setCookie } from 'hono/cookie'
import { AuthManager, requireAuth, generateCsrfToken, rateLimit } from '../middleware'
import { getJwtExpirySecondsFromDb, getJwtRefreshGraceSecondsFromDb } from '../middleware/auth'
import { getCacheService, CACHE_CONFIGS } from '../services'
import { setAdminExists } from '../services/auth-validation'
import type { Bindings, Variables } from '../app'
import { getCustomData } from '../features/user-profiles'

const JWT_SECRET_FALLBACK = 'your-super-secret-jwt-key-change-in-production'

/** Set a signed CSRF cookie alongside the auth cookie on login/register. */
async function setCsrfCookie(c: any, maxAge?: number): Promise<void> {
  const secret = c.env?.JWT_SECRET || JWT_SECRET_FALLBACK
  const isDev = c.env?.ENVIRONMENT === 'development' || !c.env?.ENVIRONMENT
  const csrfToken = await generateCsrfToken(secret)
  const cookieMaxAge = maxAge ?? (await getJwtExpirySecondsFromDb(c.env?.DB, c.env))
  setCookie(c, 'csrf_token', csrfToken, {
    httpOnly: false,
    secure: !isDev,
    sameSite: 'Strict',
    path: '/',
    maxAge: cookieMaxAge,
  })
}

/** Clear the CSRF cookie on logout. */
function clearCsrfCookie(c: any): void {
  setCookie(c, 'csrf_token', '', {
    httpOnly: false,
    secure: false,
    sameSite: 'Strict',
    path: '/',
    maxAge: 0,
  })
}

const authRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

export async function getCurrentSession(c: Context<{ Bindings: Bindings; Variables: Variables }>) {
  try {
    const user = c.get('user')

    if (!user) {
      return c.json({ error: 'Not authenticated' }, 401)
    }

    const db = c.env.DB
    const userData = await db.prepare('SELECT id, email, username, first_name, last_name, role, created_at FROM users WHERE id = ?')
      .bind(user.userId)
      .first() as Record<string, any> | null

    if (!userData) {
      return c.json({ error: 'User not found' }, 404)
    }

    const customData = await getCustomData(db, user.userId)
    return c.json({ user: { ...userData, ...customData } })
  } catch (error) {
    console.error('Get session error:', error)
    return c.json({ error: 'Failed to get session' }, 500)
  }
}

// Login schema
const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
})

const firstAdminRegisterSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(1).max(100).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
})

// Register the first admin user only.
authRoutes.post('/register',
  rateLimit({ max: 30, windowMs: 60 * 1000, keyPrefix: 'register' }),
  async (c) => {
    try {
      const db = c.env.DB

      const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').first() as any
      if (Number(userCount?.count || 0) > 0) {
        return c.json({ error: 'Registration is only available before the first admin account is created' }, 403)
      }

      let requestData: unknown
      try {
        requestData = await c.req.json()
      } catch {
        return c.json({ error: 'Invalid JSON in request body' }, 400)
      }

      const validation = firstAdminRegisterSchema.safeParse(requestData)
      if (!validation.success) {
        return c.json({ error: 'Validation failed', details: validation.error.issues }, 400)
      }

      const validatedData = validation.data
      const email = validatedData.email
      const password = validatedData.password
      const normalizedEmail = email.toLowerCase()
      const username = validatedData.username || normalizedEmail.split('@')[0] || 'admin'
      const firstName = validatedData.firstName || 'Admin'
      const lastName = validatedData.lastName || 'User'
      const passwordHash = await AuthManager.hashPassword(password)
      const userId = crypto.randomUUID()
      const now = Date.now()
      
      await db.prepare(`
        INSERT INTO users (id, email, username, first_name, last_name, password_hash, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        normalizedEmail,
        username,
        firstName,
        lastName,
        passwordHash,
        'admin',
        1,
        now,
        now
      ).run()
      setAdminExists()

      const tokenTtl = await getJwtExpirySecondsFromDb(c.env.DB, c.env)
      const token = await AuthManager.generateToken(userId, normalizedEmail, 'admin', c.env.JWT_SECRET, tokenTtl)

      setCookie(c, 'auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: tokenTtl
      })

      // Set CSRF cookie for browser sessions
      await setCsrfCookie(c)

      return c.json({
        user: {
          id: userId,
          email: normalizedEmail,
          username,
          firstName,
          lastName,
          role: 'admin'
        },
        token
      }, 201)
    } catch (error) {
      console.error('Registration error:', error)
      return c.json({
        error: 'Registration failed',
        details: error instanceof Error ? error.message : String(error)
      }, 500)
    }
  }
)

// Login user
authRoutes.post('/login',
  rateLimit({ max: 30, windowMs: 60 * 1000, keyPrefix: 'login' }),
  async (c) => {
    try {
      const body = await c.req.json()
      const validation = loginSchema.safeParse(body)
      if (!validation.success) {
        return c.json({ error: 'Validation failed', details: validation.error.issues }, 400)
      }
      const { email, password } = validation.data
      const db = c.env.DB
      
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase()
      
      // Find user with caching
      const cache = getCacheService(CACHE_CONFIGS.user!, c.env.CACHE_KV)
      let user = await cache.get<any>(cache.generateKey('user', `email:${normalizedEmail}`))

      if (!user) {
        user = await db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1')
          .bind(normalizedEmail)
          .first() as any

        if (user) {
          // Cache the user for faster subsequent lookups
          await cache.set(cache.generateKey('user', `email:${normalizedEmail}`), user)
          await cache.set(cache.generateKey('user', user.id), user)
        }
      }

      if (!user) {
        return c.json({ error: 'Invalid email or password' }, 401)
      }
      
      // Verify password
      const isValidPassword = await AuthManager.verifyPassword(password, user.password_hash)
      if (!isValidPassword) {
        return c.json({ error: 'Invalid email or password' }, 401)
      }

      // Transparent password hash migration: re-hash legacy SHA-256 to PBKDF2
      if (AuthManager.isLegacyHash(user.password_hash)) {
        try {
          const newHash = await AuthManager.hashPassword(password)
          await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
            .bind(newHash, Date.now(), user.id)
            .run()
        } catch (rehashError) {
          console.error('Password rehash failed (non-fatal):', rehashError)
        }
      }

      // Generate JWT token
      const tokenTtl = await getJwtExpirySecondsFromDb(c.env.DB, c.env)
      const token = await AuthManager.generateToken(user.id, user.email, user.role, c.env.JWT_SECRET, tokenTtl)

      // Set HTTP-only cookie
      setCookie(c, 'auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: tokenTtl
      })

      // Set CSRF cookie for browser sessions
      await setCsrfCookie(c)

      // Update last login
      await db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
        .bind(new Date().getTime(), user.id)
        .run()

      // Invalidate user cache on login
      await cache.delete(cache.generateKey('user', user.id))
      await cache.delete(cache.generateKey('user', `email:${normalizedEmail}`))

      return c.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        token
      })
    } catch (error) {
      console.error('Login error:', error)
      return c.json({ error: 'Login failed' }, 500)
    }
})

// Logout user (both GET and POST for convenience)
authRoutes.post('/logout', (c) => {
  // Clear the auth cookie
  setCookie(c, 'auth_token', '', {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'Strict',
    maxAge: 0 // Expire immediately
  })
  clearCsrfCookie(c)

  return c.json({ message: 'Logged out successfully' })
})

authRoutes.get('/logout', (c) => {
  // Clear the auth cookie
  setCookie(c, 'auth_token', '', {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'Strict',
    maxAge: 0 // Expire immediately
  })
  clearCsrfCookie(c)

  return c.redirect('/auth/login?message=You have been logged out successfully')
})

// Get current authenticated session.
authRoutes.get('/session', requireAuth(), getCurrentSession)

// Legacy alias for the current session endpoint.
authRoutes.get('/me', requireAuth(), getCurrentSession)

// Refresh token (sliding session)
//
// Accepts a valid JWT — or one that has expired within the grace window
// (`JWT_REFRESH_GRACE_SECONDS`, default 7 days) — and issues a fresh JWT
// with a new `exp`. This lets a long-lived session cookie keep a user
// logged in across JWT expirations without forcing a full re-login.
//
// Security: the caller must still present a valid-signature token that
// recently belonged to an active user. Fully forged or long-expired tokens
// are rejected.
authRoutes.post('/refresh',
  rateLimit({ max: 60, windowMs: 60 * 1000, keyPrefix: 'refresh' }),
  async (c) => {
  try {
    // Accept token from Authorization header or cookie
    let token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) token = getCookie(c, 'auth_token')

    if (!token) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const db = c.env.DB
    const grace = await getJwtRefreshGraceSecondsFromDb(db, c.env)

    const payload = await AuthManager.verifyToken(token, c.env.JWT_SECRET, grace)
    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    // Re-validate the user is still active, and pick up any role changes.
    const row = await db.prepare('SELECT id, email, role, is_active FROM users WHERE id = ?')
      .bind(payload.userId)
      .first() as any

    if (!row || !row.is_active) {
      return c.json({ error: 'User is not active' }, 401)
    }

    // Generate new token with a fresh exp
    const tokenTtl = await getJwtExpirySecondsFromDb(db, c.env)
    const newToken = await AuthManager.generateToken(row.id, row.email, row.role, c.env.JWT_SECRET, tokenTtl)

    // Set new cookie
    setCookie(c, 'auth_token', newToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: tokenTtl
    })

    // Set CSRF cookie for browser sessions
    await setCsrfCookie(c)

    return c.json({
      token: newToken,
      expiresIn: tokenTtl
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return c.json({ error: 'Token refresh failed' }, 500)
  }
})

export default authRoutes
