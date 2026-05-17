/**
 * Middleware barrel export tests
 */

import { describe, expect, it, vi } from 'vitest'
import {
  getActivePlugins,
  isPluginActive,
  requireActivePlugin,
  requireActivePlugins,
} from './index'

function createMockDb() {
  return {
    prepare: vi.fn(),
  }
}

describe('middleware barrel compatibility exports', () => {
  it('delegates plugin compatibility helpers to the built-in implementation', async () => {
    const db = createMockDb()

    await expect(isPluginActive(db as any, 'core-cache')).resolves.toBe(true)
    await expect(requireActivePlugin(db as any, 'core-cache')).resolves.not.toThrow()
    await expect(requireActivePlugins(db as any, ['core-cache', 'analytics'])).resolves.not.toThrow()
    await expect(getActivePlugins(db as any)).resolves.toEqual([])

    expect(db.prepare).not.toHaveBeenCalled()
  })
})
