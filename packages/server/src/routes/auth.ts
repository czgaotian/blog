import { Hono } from 'hono'
// import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getCookie, setCookie } from 'hono/cookie'
import { AuthManager, requireAuth, generateCsrfToken, rateLimit } from '../middleware'
import { getJwtExpirySecondsFromDb, getJwtRefreshGraceSecondsFromDb } from '../middleware/auth'
import { getCacheService, CACHE_CONFIGS } from '../services'
import { authValidationService, isRegistrationEnabled, isFirstUserRegistration } from '../services/auth-validation'
import type { RegistrationData } from '../services/auth-validation'
import type { Bindings, Variables } from '../app'
import { getUserProfileConfig, getRegistrationFields, getProfileFieldDefaults, sanitizeCustomData, saveCustomData, getCustomData } from '../features/user-profiles'

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

// Login schema
const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
})

// Register new user
authRoutes.post('/register',
  rateLimit({ max: 30, windowMs: 60 * 1000, keyPrefix: 'register' }),
  async (c) => {
    try {
      const db = c.env.DB

      // Check if this is the first user (bootstrap scenario) - always allow
      const isFirstUser = await isFirstUserRegistration(db)

      // If not first user, check if registration is enabled
      if (!isFirstUser) {
        const registrationEnabled = await isRegistrationEnabled(db)
        if (!registrationEnabled) {
          return c.json({ error: 'Registration is currently disabled' }, 403)
        }
      }

      // Parse JSON with error handling
      let requestData
      try {
        requestData = await c.req.json()
      } catch (parseError) {
        return c.json({ error: 'Invalid JSON in request body' }, 400)
      }

      // Build and validate using dynamic schema
      const validationSchema = await authValidationService.buildRegistrationSchema(db)

      let validatedData: RegistrationData
      try {
        validatedData = await validationSchema.parseAsync(requestData)
      } catch (validationError: any) {
        return c.json({
          error: 'Validation failed',
          details: validationError.issues?.map((e: any) => e.message) || [validationError.message || 'Invalid request data']
        }, 400)
      }

      // Extract fields with defaults for optional ones
      const email = validatedData.email
      const password = validatedData.password
      const username = validatedData.username || authValidationService.generateDefaultValue('username', validatedData)
      const firstName = validatedData.firstName || authValidationService.generateDefaultValue('firstName', validatedData)
      const lastName = validatedData.lastName || authValidationService.generateDefaultValue('lastName', validatedData)

      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase()
      
      // Check if user already exists
      const existingUser = await db.prepare('SELECT id FROM users WHERE email = ? OR username = ?')
        .bind(normalizedEmail, username)
        .first()
      
      if (existingUser) {
        return c.json({ error: 'User with this email or username already exists' }, 400)
      }
      
      // Hash password
      const passwordHash = await AuthManager.hashPassword(password)
      
      // Create user
      const userId = crypto.randomUUID()
      const now = new Date()
      
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
        'viewer', // Default role
        1, // is_active
        now.getTime(),
        now.getTime()
      ).run()
      
      // Save custom profile fields if configured
      const profileConfig = getUserProfileConfig()
      if (profileConfig) {
        const regFields = getRegistrationFields()
        if (regFields.length > 0) {
          const customData: Record<string, any> = { ...getProfileFieldDefaults() }
          for (const field of regFields) {
            if (requestData[field.name] !== undefined) {
              customData[field.name] = requestData[field.name]
            }
          }
          const sanitized = sanitizeCustomData(customData, profileConfig)
          await saveCustomData(db, userId, sanitized)
        }
      }

      // Generate JWT token
      const tokenTtl = await getJwtExpirySecondsFromDb(c.env.DB, c.env)
      const token = await AuthManager.generateToken(userId, normalizedEmail, 'viewer', c.env.JWT_SECRET, tokenTtl)

      // Set HTTP-only cookie
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
          role: 'viewer'
        },
        token
      }, 201)
    } catch (error) {
      console.error('Registration error:', error)
      // Return validation errors as 400, other errors as 500
      if (error instanceof Error && error.message.includes('validation')) {
        return c.json({ error: error.message }, 400)
      }
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

  return c.redirect('/admin/auth/login?message=You have been logged out successfully')
})

// Get current user
authRoutes.get('/me', requireAuth(), async (c) => {
  try {
    // This would need the auth middleware applied
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
    console.error('Get user error:', error)
    return c.json({ error: 'Failed to get user' }, 500)
  }
})

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

// Test seeding endpoint (only for development/testing)
authRoutes.post('/seed-admin',
  rateLimit({ max: 10, windowMs: 60 * 1000, keyPrefix: 'seed-admin' }),
  async (c) => {
  try {
    const db = c.env.DB
    
    // First ensure the users table exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'viewer',
        avatar TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_login_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `).run()
    
    // Check if admin user already exists
    const existingAdmin = await db.prepare('SELECT id FROM users WHERE email = ? OR username = ?')
      .bind('admin@worker-blog.com', 'admin')
      .first()

    if (existingAdmin) {
      // Update the password to ensure it's correct for testing
      const passwordHash = await AuthManager.hashPassword('worker-blog!')
      await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
        .bind(passwordHash, Date.now(), existingAdmin.id)
        .run()

      return c.json({
        message: 'Admin user already exists (password updated)',
        user: {
          id: existingAdmin.id,
          email: 'admin@worker-blog.com',
          username: 'admin',
          role: 'admin'
        }
      })
    }

    // Hash password
    const passwordHash = await AuthManager.hashPassword('worker-blog!')
    
    // Create admin user
    const userId = 'admin-user-id'
    const now = Date.now()
    const adminEmail = 'admin@worker-blog.com'.toLowerCase()
    
    await db.prepare(`
      INSERT INTO users (id, email, username, first_name, last_name, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      adminEmail,
      'admin',
      'Admin',
      'User',
      passwordHash,
      'admin',
      1, // is_active
      now,
      now
    ).run()
    
    return c.json({ 
      message: 'Admin user created successfully',
      user: {
        id: userId,
        email: adminEmail,
        username: 'admin',
        role: 'admin'
      },
      passwordHash: passwordHash // For debugging
    })
  } catch (error) {
    console.error('Seed admin error:', error)
    return c.json({ error: 'Failed to create admin user', details: error instanceof Error ? error.message : String(error) }, 500)
  }
})


// Process invitation acceptance
authRoutes.post('/accept-invitation', async (c) => {
  try {
    const body = await c.req.json() as {
      token?: string
      username?: string
      password?: string
      confirmPassword?: string
    }
    const token = body.token
    const username = body.username?.trim()
    const password = body.password
    const confirmPassword = body.confirmPassword || body.password

    if (!token || !password || !confirmPassword) {
      return c.json({ error: 'All fields are required' }, 400)
    }

    if (password !== confirmPassword) {
      return c.json({ error: 'Passwords do not match' }, 400)
    }

    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters long' }, 400)
    }

    const db = c.env.DB

    // Check if invitation token is valid
    const userStmt = db.prepare(`
      SELECT id, email, first_name, last_name, role, invited_at
      FROM users 
      WHERE invitation_token = ? AND is_active = 0
    `)
    const invitedUser = await userStmt.bind(token).first() as any

    if (!invitedUser) {
      return c.json({ error: 'Invalid or expired invitation' }, 400)
    }

    // Check if invitation is expired (7 days)
    const invitationAge = Date.now() - invitedUser.invited_at
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
    
    if (invitationAge > maxAge) {
      return c.json({ error: 'Invitation has expired' }, 400)
    }

    // Check if username is available
    const existingUsernameStmt = db.prepare(`
      SELECT id FROM users WHERE username = ? AND id != ?
    `)
    const existingUsername = await existingUsernameStmt.bind(username, invitedUser.id).first()

    if (existingUsername) {
      return c.json({ error: 'Username is already taken' }, 400)
    }

    // Hash password
    const passwordHash = await AuthManager.hashPassword(password)

    // Activate user account
    const updateStmt = db.prepare(`
      UPDATE users SET 
        username = COALESCE(?, username),
        password_hash = ?,
        is_active = 1,
        email_verified = 1,
        invitation_token = NULL,
        accepted_invitation_at = ?,
        updated_at = ?
      WHERE id = ?
    `)

    await updateStmt.bind(
      username || null,
      passwordHash,
      Date.now(),
      Date.now(),
      invitedUser.id
    ).run()

    // Generate JWT token for auto-login
    const tokenTtl = await getJwtExpirySecondsFromDb(c.env.DB, c.env)
    const authToken = await AuthManager.generateToken(invitedUser.id, invitedUser.email, invitedUser.role, c.env.JWT_SECRET, tokenTtl)

    // Set HTTP-only cookie
    setCookie(c, 'auth_token', authToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: tokenTtl
    })

    // Set CSRF cookie for browser sessions
    await setCsrfCookie(c)

    // Log the activity (TODO: implement activity logging)
    // Activity logging is deferred until utils/log-activity is implemented

    return c.json({ message: 'Invitation accepted successfully' })

  } catch (error) {
    console.error('Accept invitation error:', error)
    return c.json({ error: 'Failed to accept invitation' }, 500)
  }
})

// Request password reset
authRoutes.post('/request-password-reset',
  rateLimit({ max: 3, windowMs: 15 * 60 * 1000, keyPrefix: 'password-reset' }),
  async (c) => {
  try {
    const body = await c.req.json() as { email?: string }
    const email = body.email?.trim()?.toLowerCase()

    if (!email) {
      return c.json({ error: 'Email is required' }, 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Please enter a valid email address' }, 400)
    }

    const db = c.env.DB

    // Check if user exists and is active
    const userStmt = db.prepare(`
      SELECT id, email, first_name, last_name FROM users 
      WHERE email = ? AND is_active = 1
    `)
    const user = await userStmt.bind(email).first() as any

    // Always return success to prevent email enumeration
    if (!user) {
      return c.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      })
    }

    // Generate password reset token (expires in 1 hour)
    const resetToken = crypto.randomUUID()
    const resetExpires = Date.now() + (60 * 60 * 1000) // 1 hour

    // Update user with reset token
    const updateStmt = db.prepare(`
      UPDATE users SET 
        password_reset_token = ?,
        password_reset_expires = ?,
        updated_at = ?
      WHERE id = ?
    `)

    await updateStmt.bind(
      resetToken,
      resetExpires,
      Date.now(),
      user.id
    ).run()

    // Log the activity (TODO: implement activity logging)
    // Activity logging is deferred until utils/log-activity is implemented

    // In a real implementation, you would send an email here
    // For now, we'll return the reset link for development
    const resetLink = `${c.req.header('origin') || 'http://localhost:8787'}/admin/auth/reset-password?token=${resetToken}`

    return c.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.',
      reset_link: resetLink // In production, this would be sent via email
    })

  } catch (error) {
    console.error('Password reset request error:', error)
    return c.json({ error: 'Failed to process password reset request' }, 500)
  }
})

// Process password reset
authRoutes.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json() as { token?: string; password?: string; confirmPassword?: string }
    const token = body.token
    const password = body.password
    const confirmPassword = body.confirmPassword

    if (!token || !password || !confirmPassword) {
      return c.json({ error: 'All fields are required' }, 400)
    }

    if (password !== confirmPassword) {
      return c.json({ error: 'Passwords do not match' }, 400)
    }

    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters long' }, 400)
    }

    const db = c.env.DB

    // Check if reset token is valid and not expired
    const userStmt = db.prepare(`
      SELECT id, email, password_hash, password_reset_expires
      FROM users
      WHERE password_reset_token = ? AND is_active = 1
    `)
    const user = await userStmt.bind(token).first() as any

    if (!user) {
      return c.json({ error: 'Invalid or expired reset token' }, 400)
    }

    // Check if token is expired
    if (Date.now() > user.password_reset_expires) {
      return c.json({ error: 'Reset token has expired' }, 400)
    }

    // Hash new password
    const newPasswordHash = await AuthManager.hashPassword(password)

    // Store old password in history (skip if table doesn't exist)
    try {
      const historyStmt = db.prepare(`
        INSERT INTO password_history (id, user_id, password_hash, created_at)
        VALUES (?, ?, ?, ?)
      `)
      await historyStmt.bind(
        crypto.randomUUID(),
        user.id,
        user.password_hash,
        Date.now()
      ).run()
    } catch (historyError) {
      // Password history table may not exist yet
      console.warn('Could not store password history:', historyError)
    }

    // Update user password and clear reset token
    const updateStmt = db.prepare(`
      UPDATE users SET
        password_hash = ?,
        password_reset_token = NULL,
        password_reset_expires = NULL,
        updated_at = ?
      WHERE id = ?
    `)

    await updateStmt.bind(
      newPasswordHash,
      Date.now(),
      user.id
    ).run()

    // Log the activity (TODO: implement activity logging)
    // Activity logging is deferred until utils/log-activity is implemented

    return c.json({ message: 'Password reset successfully' })

  } catch (error) {
    console.error('Password reset error:', error)
    return c.json({ error: 'Failed to reset password' }, 500)
  }
})

export default authRoutes
