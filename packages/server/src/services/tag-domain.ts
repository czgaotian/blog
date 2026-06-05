export interface TagInput {
  name: string
  slug?: string
  description?: string | null
  color: string
}

export interface TagPatch {
  name?: string
  slug?: string
  description?: string | null
  color?: string
}

export interface MutateTagResult {
  ok: boolean
  id?: string
  reason?: 'not_found' | 'duplicate_slug' | 'in_use'
}

export async function createTag(
  db: D1Database,
  input: TagInput,
  options: { id?: string; now?: number } = {},
): Promise<MutateTagResult> {
  const slug = normalizeSlug(input.slug || input.name)
  if (await tagSlugExists(db, slug)) return { ok: false, reason: 'duplicate_slug' }

  const id = options.id ?? crypto.randomUUID()
  const now = options.now ?? Date.now()

  await db
    .prepare('INSERT INTO tags (id, name, slug, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, input.name, slug, input.description ?? null, input.color, now, now)
    .run()

  return { ok: true, id }
}

export async function updateTag(
  db: D1Database,
  id: string,
  patch: TagPatch,
  options: { now?: number } = {},
): Promise<MutateTagResult> {
  const existing = await db.prepare('SELECT * FROM tags WHERE id = ?').bind(id).first() as any
  if (!existing) return { ok: false, reason: 'not_found' }

  const name = patch.name ?? existing.name
  const slug = patch.slug ? normalizeSlug(patch.slug) : existing.slug
  const description = patch.description !== undefined ? patch.description : existing.description
  const color = patch.color !== undefined ? patch.color : existing.color

  if (slug !== existing.slug && await tagSlugExists(db, slug, id)) {
    return { ok: false, reason: 'duplicate_slug' }
  }

  await db
    .prepare('UPDATE tags SET name = ?, slug = ?, description = ?, color = ?, updated_at = ? WHERE id = ?')
    .bind(name, slug, description ?? null, color, options.now ?? Date.now(), id)
    .run()

  return { ok: true, id }
}

export async function deleteTag(db: D1Database, id: string): Promise<MutateTagResult> {
  const existing = await db.prepare('SELECT id FROM tags WHERE id = ?').bind(id).first()
  if (!existing) return { ok: false, reason: 'not_found' }

  const content = await db.prepare('SELECT content_id FROM content_tags WHERE tag_id = ? LIMIT 1').bind(id).first()
  if (content) return { ok: false, reason: 'in_use' }

  await db.prepare('DELETE FROM tags WHERE id = ?').bind(id).run()
  return { ok: true, id }
}

async function tagSlugExists(db: D1Database, slug: string, excludeId?: string): Promise<boolean> {
  let sql = 'SELECT id FROM tags WHERE slug = ?'
  const params: string[] = [slug]
  if (excludeId) {
    sql += ' AND id != ?'
    params.push(excludeId)
  }
  return Boolean(await db.prepare(sql).bind(...params).first())
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
