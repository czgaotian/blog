import { describe, expect, it, vi } from 'vitest'
import { deleteContent } from './content-domain'

function createMockDb(existing: any = { id: 'content-1', collection_id: 'collection-1' }) {
  const calls: Array<{ sql: string; args: any[] }> = []
  const db = {
    prepare: vi.fn((sql: string) => ({
      bind: (...args: any[]) => {
        calls.push({ sql, args })
        return {
          first: async () => existing,
          run: async () => ({ success: true }),
        }
      },
    })),
  }

  return { db, calls }
}

describe('content domain deletion', () => {
  it('soft deletes admin content', async () => {
    const { db, calls } = createMockDb()

    const result = await deleteContent({
      db: db as any,
      id: 'content-1',
      mode: 'admin-soft',
      now: 123,
    })

    expect(result).toEqual({
      found: true,
      id: 'content-1',
      collectionId: 'collection-1',
      mode: 'admin-soft',
    })
    expect(calls.some((call) => call.sql.includes("UPDATE content SET status = 'deleted'"))).toBe(true)
    expect(calls.some((call) => call.sql.includes('DELETE FROM content'))).toBe(false)
  })

  it('hard deletes headless content', async () => {
    const { db, calls } = createMockDb()

    const result = await deleteContent({
      db: db as any,
      id: 'content-1',
      mode: 'headless-hard',
    })

    expect(result.found).toBe(true)
    expect(result.mode).toBe('headless-hard')
    expect(calls.some((call) => call.sql.includes('DELETE FROM content WHERE id = ?'))).toBe(true)
    expect(calls.some((call) => call.sql.includes("UPDATE content SET status = 'deleted'"))).toBe(false)
  })

  it('returns not found without mutating content', async () => {
    const { db, calls } = createMockDb(null)

    const result = await deleteContent({
      db: db as any,
      id: 'missing',
      mode: 'admin-soft',
    })

    expect(result).toEqual({
      found: false,
      id: 'missing',
      mode: 'admin-soft',
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.sql).toContain('SELECT id, collection_id FROM content')
  })
})
