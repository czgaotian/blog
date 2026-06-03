import { describe, expect, it, vi } from 'vitest'
import { createTag, deleteTag } from './tag-domain'

function createMockDb(firstBySql: (sql: string) => any = () => null) {
  const calls: Array<{ sql: string; args: any[] }> = []
  const db = {
    prepare: vi.fn((sql: string) => ({
      bind: (...args: any[]) => {
        calls.push({ sql, args })
        return {
          first: async () => firstBySql(sql),
          run: async () => ({ success: true }),
        }
      },
    })),
  }
  return { db, calls }
}

describe('tag domain', () => {
  it('creates a tag with a generated slug', async () => {
    const { db, calls } = createMockDb(() => null)

    const result = await createTag(db as any, { name: 'Cloudflare Workers' }, { id: 'tag-1', now: 123 })

    expect(result).toEqual({ ok: true, id: 'tag-1' })
    expect(calls.some((call) => call.sql.includes('INSERT INTO tags'))).toBe(true)
    expect(calls.some((call) => call.args.includes('cloudflare-workers'))).toBe(true)
  })

  it('rejects duplicate tag slugs', async () => {
    const { db } = createMockDb((sql) => {
      if (sql.includes('SELECT id FROM tags WHERE slug = ?')) return { id: 'existing' }
      return null
    })

    const result = await createTag(db as any, { name: 'Cloudflare Workers' })
    expect(result).toEqual({ ok: false, reason: 'duplicate_slug' })
  })

  it('does not delete tags used by content', async () => {
    const { db } = createMockDb((sql) => {
      if (sql.includes('SELECT id FROM tags WHERE id = ?')) return { id: 'tag-1' }
      if (sql.includes('SELECT content_id FROM content_tags WHERE tag_id = ?')) return { content_id: 'content-1' }
      return null
    })

    const result = await deleteTag(db as any, 'tag-1')
    expect(result).toEqual({ ok: false, reason: 'in_use' })
  })
})
