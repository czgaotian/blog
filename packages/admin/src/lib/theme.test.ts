import { describe, expect, it } from 'vitest'
import { getInitialTheme, setStoredTheme, type Theme } from './theme'

function createStorage(initial?: string): Storage {
  const entries = new Map<string, string>()
  if (initial !== undefined) {
    entries.set('admin-theme', initial)
  }

  return {
    get length() {
      return entries.size
    },
    clear() {
      entries.clear()
    },
    getItem(key: string) {
      return entries.get(key) ?? null
    },
    key(index: number) {
      return Array.from(entries.keys())[index] ?? null
    },
    removeItem(key: string) {
      entries.delete(key)
    },
    setItem(key: string, value: string) {
      entries.set(key, value)
    },
  }
}

describe('admin theme persistence', () => {
  it('uses stored dark preference when present', () => {
    expect(getInitialTheme(createStorage('dark'), false)).toBe('dark')
  })

  it('falls back to system preference when storage is empty', () => {
    expect(getInitialTheme(createStorage(), true)).toBe('dark')
    expect(getInitialTheme(createStorage(), false)).toBe('light')
  })

  it('persists explicit theme selections', () => {
    const storage = createStorage()

    setStoredTheme(storage, 'dark')

    expect(storage.getItem('admin-theme')).toBe('dark' satisfies Theme)
  })
})
