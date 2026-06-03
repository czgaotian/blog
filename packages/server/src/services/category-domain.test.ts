import { describe, expect, it, vi } from 'vitest'
import { createCategory, deleteCategory, updateCategory } from './category-domain'

function createMockDb(firstBySql: (sql: string, args: any[]) => any = () => null) {
  const calls: Array<{ sql: string; args: any[] }> = []
  const db = {
    prepare: vi.fn((sql: string) => ({
      bind: (...args: any[]) => {
        calls.push({ sql, args })
        return {
          first: async () => firstBySql(sql, args),
          run: async () => ({ success: true }),
        }
      },
    })),
  }
  return { db, calls }
}

describe('category domain', () => {
  it('creates a category with a generated slug', async () => {
    const { db, calls } = createMockDb(() => null)

    const result = await createCategory(db as any, {
      name: 'Front End',
    }, { id: 'cat-1', now: 123 })

    expect(result).toEqual({ ok: true, id: 'cat-1' })
    expect(calls.some((call) => call.sql.includes('INSERT INTO categories'))).toBe(true)
    expect(calls.some((call) => call.args.includes('front-end'))).toBe(true)
  })

  it('rejects duplicate category slugs', async () => {
    const { db } = createMockDb((sql) => {
      if (sql.includes('SELECT id FROM categories WHERE slug = ?')) return { id: 'existing' }
      return null
    })

    const result = await createCategory(db as any, { name: 'Front End' })
    expect(result).toEqual({ ok: false, reason: 'duplicate_slug' })
  })

  it('rejects category parent cycles', async () => {
    const { db } = createMockDb((sql, args) => {
      if (sql.includes('SELECT * FROM categories WHERE id = ?')) {
        return { id: 'cat-1', name: 'Child', slug: 'child', parent_id: null, sort_order: 0 }
      }
      if (sql.includes('SELECT id FROM categories WHERE id = ?')) return { id: args[0] }
      if (sql.includes('SELECT parent_id FROM categories WHERE id = ?')) {
        if (args[0] === 'cat-2') return { parent_id: 'cat-1' }
      }
      return null
    })

    const result = await updateCategory(db as any, 'cat-1', { parentId: 'cat-2' })
    expect(result).toEqual({ ok: false, reason: 'cycle' })
  })

  it('does not delete categories used by contents', async () => {
    const { db } = createMockDb((sql) => {
      if (sql.includes('SELECT id FROM categories WHERE id = ?')) return { id: 'cat-1' }
      if (sql.includes('SELECT id FROM contents WHERE category_id = ?')) return { id: 'content-1' }
      return null
    })

    const result = await deleteCategory(db as any, 'cat-1')
    expect(result).toEqual({ ok: false, reason: 'in_use' })
  })
})
