/**
 * Plugin Middleware Compatibility Tests
 */

import { describe, it, expect, vi } from 'vitest'
import {
  isPluginActive,
  requireActivePlugin,
  requireActivePlugins,
  getActivePlugins
} from './plugin-middleware'

function createMockDb() {
  return {
    prepare: vi.fn()
  }
}

describe('plugin middleware compatibility helpers', () => {
  it('treats migrated plugin functionality as built in', async () => {
    const db = createMockDb()

    await expect(isPluginActive(db as any, 'any-plugin')).resolves.toBe(true)
    await expect(requireActivePlugin(db as any, 'any-plugin')).resolves.not.toThrow()
    await expect(requireActivePlugins(db as any, ['plugin-a', 'plugin-b'])).resolves.not.toThrow()

    expect(db.prepare).not.toHaveBeenCalled()
  })

  it('returns no active plugin records because plugin status is no longer runtime state', async () => {
    const db = createMockDb()

    await expect(getActivePlugins(db as any)).resolves.toEqual([])
    expect(db.prepare).not.toHaveBeenCalled()
  })
})
