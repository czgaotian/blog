export interface CategoryInput {
  name: string
  slug?: string
  description?: string | null
  parentId?: string | null
  sortOrder?: number
}

export interface CategoryPatch {
  name?: string
  slug?: string
  description?: string | null
  parentId?: string | null
  sortOrder?: number
}

export interface MutateCategoryResult {
  ok: boolean
  id?: string
  reason?: 'not_found' | 'duplicate_slug' | 'parent_not_found' | 'self_parent' | 'cycle' | 'in_use' | 'no_fields'
}

export async function createCategory(
  db: D1Database,
  input: CategoryInput,
  options: { id?: string; now?: number } = {},
): Promise<MutateCategoryResult> {
  const slug = normalizeSlug(input.slug || input.name)
  if (await categorySlugExists(db, slug)) return { ok: false, reason: 'duplicate_slug' }

  const parentId = input.parentId || null
  if (parentId && !(await categoryExists(db, parentId))) return { ok: false, reason: 'parent_not_found' }

  const id = options.id ?? crypto.randomUUID()
  const now = options.now ?? Date.now()

  await db
    .prepare(`
      INSERT INTO categories (id, name, slug, description, parent_id, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(id, input.name, slug, input.description ?? null, parentId, input.sortOrder ?? 0, now, now)
    .run()

  return { ok: true, id }
}

export async function updateCategory(
  db: D1Database,
  id: string,
  patch: CategoryPatch,
  options: { now?: number } = {},
): Promise<MutateCategoryResult> {
  const existing = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first() as any
  if (!existing) return { ok: false, reason: 'not_found' }

  const name = patch.name ?? existing.name
  const slug = patch.slug ? normalizeSlug(patch.slug) : existing.slug
  const description = patch.description !== undefined ? patch.description : existing.description
  const parentId = patch.parentId !== undefined ? patch.parentId : existing.parent_id
  const sortOrder = patch.sortOrder ?? existing.sort_order ?? 0

  if (slug !== existing.slug && await categorySlugExists(db, slug, id)) {
    return { ok: false, reason: 'duplicate_slug' }
  }
  if (parentId) {
    if (parentId === id) return { ok: false, reason: 'self_parent' }
    if (!(await categoryExists(db, parentId))) return { ok: false, reason: 'parent_not_found' }
    if (await wouldCreateCycle(db, id, parentId)) return { ok: false, reason: 'cycle' }
  }

  await db
    .prepare(`
      UPDATE categories
      SET name = ?, slug = ?, description = ?, parent_id = ?, sort_order = ?, updated_at = ?
      WHERE id = ?
    `)
    .bind(name, slug, description ?? null, parentId || null, sortOrder, options.now ?? Date.now(), id)
    .run()

  return { ok: true, id }
}

export async function deleteCategory(db: D1Database, id: string): Promise<MutateCategoryResult> {
  const existing = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(id).first()
  if (!existing) return { ok: false, reason: 'not_found' }

  const child = await db.prepare('SELECT id FROM categories WHERE parent_id = ? LIMIT 1').bind(id).first()
  if (child) return { ok: false, reason: 'in_use' }

  const content = await db.prepare('SELECT id FROM contents WHERE category_id = ? LIMIT 1').bind(id).first()
  if (content) return { ok: false, reason: 'in_use' }

  await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()
  return { ok: true, id }
}

async function categorySlugExists(db: D1Database, slug: string, excludeId?: string): Promise<boolean> {
  let sql = 'SELECT id FROM categories WHERE slug = ?'
  const params: string[] = [slug]
  if (excludeId) {
    sql += ' AND id != ?'
    params.push(excludeId)
  }
  return Boolean(await db.prepare(sql).bind(...params).first())
}

async function categoryExists(db: D1Database, id: string): Promise<boolean> {
  return Boolean(await db.prepare('SELECT id FROM categories WHERE id = ?').bind(id).first())
}

async function wouldCreateCycle(db: D1Database, categoryId: string, parentId: string): Promise<boolean> {
  let current: string | null = parentId
  const seen = new Set<string>()

  while (current) {
    if (current === categoryId) return true
    if (seen.has(current)) return true
    seen.add(current)
    const row = await db.prepare('SELECT parent_id FROM categories WHERE id = ?').bind(current).first() as any
    current = row?.parent_id ?? null
  }

  return false
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
