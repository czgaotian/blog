import { describe, expect, it } from 'vitest'
import { AuthManager } from './auth'

describe('AuthManager password hashing', () => {
  it('verifies passwords hashed with PBKDF2', async () => {
    const hash = await AuthManager.hashPassword('password123')

    await expect(AuthManager.verifyPassword('password123', hash)).resolves.toBe(true)
    await expect(AuthManager.verifyPassword('wrong-password', hash)).resolves.toBe(false)
  })

  it('rejects non-PBKDF2 password hashes', async () => {
    const legacySha256Hash = '0'.repeat(64)

    await expect(AuthManager.verifyPassword('password123', legacySha256Hash)).resolves.toBe(false)
  })
})
