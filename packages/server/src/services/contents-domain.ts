import {
  emptyTiptapDocument,
  type JSONContent,
} from "@worker-blog/editor/schema";
import { CACHE_CONFIGS, getCacheService } from "./cache";
import { contentsCacheKeys } from "./cache-keys";
import { renderTiptapJsonToHtml } from "./content-renderer";

export type ContentCreateMode = "admin-create" | "headless-create";
export type ContentDeleteMode = "admin-soft" | "headless-hard";
export type ContentUpdateMode = "admin-update" | "headless-update";

export interface CreateContentInput {
  title: string;
  slug?: string;
  excerpt?: string | null;
  bodyJson?: JSONContent;
  status: string;
  categoryId?: string | null;
  coverImageId?: string | null;
  tagIds?: string[];
  metadata?: Record<string, unknown>;
  publishedAt?: string | null;
}

export interface CreateContentOptions {
  db: D1Database;
  mode: ContentCreateMode;
  input: CreateContentInput;
  authorId: string;
  cacheKv?: KVNamespace;
  id?: string;
  now?: number;
}

export interface CreateContentResult {
  created: boolean;
  duplicateSlug?: boolean;
  validationError?: string;
  id?: string;
  mode: ContentCreateMode;
}

export interface UpdateContentPatch {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  bodyJson?: JSONContent;
  status?: string;
  categoryId?: string | null;
  coverImageId?: string | null;
  tagIds?: string[];
  metadata?: Record<string, unknown>;
  publishedAt?: string | null;
}

export interface UpdateContentOptions {
  db: D1Database;
  id: string;
  mode: ContentUpdateMode;
  patch: UpdateContentPatch;
  authorId: string;
  cacheKv?: KVNamespace;
  now?: number;
}

export interface UpdateContentResult {
  found: boolean;
  id: string;
  mode: ContentUpdateMode;
  validationError?: string;
  duplicateSlug?: boolean;
  versionCreated?: boolean;
}

export interface RestoreContentVersionOptions {
  db: D1Database;
  id: string;
  version: number;
  authorId: string;
  cacheKv?: KVNamespace;
  now?: number;
}

export interface RestoreContentVersionResult {
  restored: boolean;
  validationError?: string;
  id: string;
  version: number;
}

export interface DeleteContentOptions {
  db: D1Database;
  id: string;
  mode: ContentDeleteMode;
  cacheKv?: KVNamespace;
  now?: number;
}

export interface DeleteContentResult {
  found: boolean;
  id: string;
  mode: ContentDeleteMode;
}

export interface ContentSnapshot {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  bodyJson: JSONContent;
  status: string;
  categoryId: string | null;
  coverImageId: string | null;
  tagIds: string[];
  metadata: Record<string, unknown>;
  publishedAt: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface NormalizedContentInput {
  slug: string;
  title: string;
  excerpt: string | null;
  bodyJson: JSONContent;
  status: string;
  categoryId: string | null;
  coverImageId: string | null;
  tagIds: string[];
  metadata: Record<string, unknown>;
  publishedAt: number | null;
}

type MediaUsageType = "body" | "cover";

export async function createContent(
  options: CreateContentOptions,
): Promise<CreateContentResult> {
  const { db, input, authorId, cacheKv } = options;
  const normalized = await normalizeAndValidateContentInput(db, {
    slug: normalizeSlug(input.slug || input.title, {
      trim: options.mode === "headless-create",
    }),
    title: input.title,
    excerpt: input.excerpt ?? null,
    bodyJson: input.bodyJson ?? cloneEmptyTiptapDocument(),
    status: input.status,
    categoryId: input.categoryId ?? null,
    coverImageId: input.coverImageId ?? null,
    tagIds: input.tagIds ?? [],
    metadata: input.metadata ?? {},
    publishedAt: parseOptionalTimestamp(input.publishedAt),
  });

  if (normalized.error) {
    return {
      created: false,
      validationError: normalized.error,
      mode: options.mode,
    };
  }
  const value = normalized.value as NormalizedContentInput;

  const duplicate = await db
    .prepare("SELECT id FROM contents WHERE slug = ? AND deleted_at IS NULL")
    .bind(value.slug)
    .first();

  if (duplicate) {
    return { created: false, duplicateSlug: true, mode: options.mode };
  }

  const id = options.id ?? crypto.randomUUID();
  const now = options.now ?? Date.now();
  const bodyHtml =
    value.status === "published" ? renderTiptapJsonToHtml(value.bodyJson) : "";

  await db
    .prepare(
      `
      INSERT INTO contents
        (id, slug, title, excerpt, body_json, body_html, status, category_id, cover_image_id, published_at, metadata, author_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .bind(
      id,
      value.slug,
      value.title,
      value.excerpt,
      JSON.stringify(value.bodyJson),
      bodyHtml,
      value.status,
      value.categoryId,
      value.coverImageId,
      value.publishedAt,
      JSON.stringify(value.metadata),
      authorId,
      now,
      now,
    )
    .run();

  await replaceContentTags(db, id, value.tagIds, now);
  await replaceContentMediaReferences(
    db,
    id,
    value.bodyJson,
    value.coverImageId,
    now,
  );

  if (options.mode === "admin-create") {
    await insertContentVersion(
      db,
      id,
      1,
      createSnapshot({
        id,
        ...value,
        author_id: authorId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      }),
      authorId,
      now,
    );
  }

  await invalidateContentCache(id, cacheKv);

  return { created: true, id, mode: options.mode };
}

export async function updateContent(
  options: UpdateContentOptions,
): Promise<UpdateContentResult> {
  const { db, id, patch, authorId, cacheKv } = options;
  const existing = (await db
    .prepare("SELECT * FROM contents WHERE id = ?")
    .bind(id)
    .first()) as any;

  if (!existing) {
    return { found: false, id, mode: options.mode };
  }

  const existingTagIds = await getContentTagIds(db, id);
  const newSlug = patch.slug
    ? normalizeSlug(patch.slug, { trim: options.mode === "headless-update" })
    : existing.slug;

  const normalized = await normalizeAndValidateContentInput(db, {
    slug: newSlug,
    title: patch.title ?? existing.title,
    excerpt: patch.excerpt !== undefined ? patch.excerpt : existing.excerpt,
    bodyJson: patch.bodyJson ?? parseJsonContent(existing.body_json),
    status: patch.status ?? existing.status,
    categoryId:
      patch.categoryId !== undefined ? patch.categoryId : existing.category_id,
    coverImageId:
      patch.coverImageId !== undefined
        ? patch.coverImageId
        : existing.cover_image_id,
    tagIds: patch.tagIds !== undefined ? patch.tagIds : existingTagIds,
    metadata: patch.metadata ?? parseJsonObject(existing.metadata),
    publishedAt:
      patch.publishedAt !== undefined
        ? parseOptionalTimestamp(patch.publishedAt)
        : existing.published_at,
  });

  if (normalized.error) {
    return {
      found: true,
      id,
      mode: options.mode,
      validationError: normalized.error,
    };
  }
  const value = normalized.value as NormalizedContentInput;

  if (value.slug !== existing.slug) {
    const duplicate = await db
      .prepare(
        "SELECT id FROM contents WHERE slug = ? AND id != ? AND deleted_at IS NULL",
      )
      .bind(value.slug, id)
      .first();

    if (duplicate) {
      return { found: true, id, mode: options.mode, duplicateSlug: true };
    }
  }

  const now = options.now ?? Date.now();
  const shouldRenderBodyHtml =
    value.status === "published" &&
    (patch.status === "published" ||
      patch.bodyJson !== undefined ||
      !existing.body_html);
  const bodyHtml = shouldRenderBodyHtml
    ? renderTiptapJsonToHtml(value.bodyJson)
    : (existing.body_html ?? "");

  await db
    .prepare(
      `
      UPDATE contents
      SET title = ?, slug = ?, excerpt = ?, body_json = ?, body_html = ?, status = ?,
          category_id = ?, cover_image_id = ?, published_at = ?, metadata = ?, updated_at = ?
      WHERE id = ?
    `,
    )
    .bind(
      value.title,
      value.slug,
      value.excerpt,
      JSON.stringify(value.bodyJson),
      bodyHtml,
      value.status,
      value.categoryId,
      value.coverImageId,
      value.publishedAt,
      JSON.stringify(value.metadata),
      now,
      id,
    )
    .run();

  await replaceContentTags(db, id, value.tagIds, now);
  await replaceContentMediaReferences(
    db,
    id,
    value.bodyJson,
    value.coverImageId,
    now,
  );

  const changed = hasContentChanged(existing, existingTagIds, value);

  if (options.mode === "admin-update" && changed) {
    const versionRes = (await db
      .prepare(
        "SELECT MAX(version) as max_version FROM content_versions WHERE content_id = ?",
      )
      .bind(id)
      .first()) as any;
    const nextVersion = (versionRes?.max_version || 0) + 1;

    await insertContentVersion(
      db,
      id,
      nextVersion,
      createSnapshot({
        id,
        ...value,
        author_id: existing.author_id,
        created_at: existing.created_at,
        updated_at: now,
        deleted_at: existing.deleted_at,
      }),
      authorId,
      now,
    );
  }

  await invalidateContentCache(id, cacheKv);

  return {
    found: true,
    id,
    mode: options.mode,
    versionCreated: options.mode === "admin-update" && changed,
  };
}

export async function deleteContent(
  options: DeleteContentOptions,
): Promise<DeleteContentResult> {
  const { db, id, mode, cacheKv } = options;
  const existing = (await db
    .prepare("SELECT id FROM contents WHERE id = ?")
    .bind(id)
    .first()) as { id: string } | null;

  if (!existing) {
    return { found: false, id, mode };
  }

  if (mode === "admin-soft") {
    const now = options.now ?? Date.now();
    await db
      .prepare(
        "UPDATE contents SET status = 'deleted', deleted_at = ?, updated_at = ? WHERE id = ?",
      )
      .bind(now, now, id)
      .run();
    await deleteContentMediaReferences(db, id);
  } else {
    await deleteContentMediaReferences(db, id);
    await db
      .prepare("DELETE FROM content_tags WHERE content_id = ?")
      .bind(id)
      .run();
    await db.prepare("DELETE FROM contents WHERE id = ?").bind(id).run();
  }

  await invalidateContentCache(id, cacheKv);

  return { found: true, id, mode };
}

export async function restoreContentVersion(
  options: RestoreContentVersionOptions,
): Promise<RestoreContentVersionResult> {
  const { db, id, version, authorId, cacheKv } = options;
  const versionRow = (await db
    .prepare(
      "SELECT data FROM content_versions WHERE content_id = ? AND version = ?",
    )
    .bind(id, version)
    .first()) as { data: string } | null;

  if (!versionRow) {
    return { restored: false, id, version };
  }

  const snapshot = parseSnapshot(versionRow.data);
  const normalized = await normalizeAndValidateContentInput(db, {
    slug: snapshot.slug,
    title: snapshot.title,
    excerpt: snapshot.excerpt,
    bodyJson: snapshot.bodyJson,
    status: snapshot.status,
    categoryId: snapshot.categoryId,
    coverImageId: snapshot.coverImageId,
    tagIds: snapshot.tagIds,
    metadata: snapshot.metadata,
    publishedAt: parseOptionalTimestamp(snapshot.publishedAt),
  });

  if (normalized.error) {
    return { restored: false, validationError: normalized.error, id, version };
  }
  const value = normalized.value as NormalizedContentInput;

  const now = options.now ?? Date.now();
  const versionCountRes = (await db
    .prepare(
      "SELECT MAX(version) as max_version FROM content_versions WHERE content_id = ?",
    )
    .bind(id)
    .first()) as any;
  const nextVersion = (versionCountRes?.max_version || 0) + 1;
  const bodyHtml =
    value.status === "published" ? renderTiptapJsonToHtml(value.bodyJson) : "";

  await db
    .prepare(
      `
      UPDATE contents
      SET title = ?, slug = ?, excerpt = ?, body_json = ?, body_html = ?, status = ?,
          category_id = ?, cover_image_id = ?, published_at = ?, metadata = ?, updated_at = ?, deleted_at = ?
      WHERE id = ?
    `,
    )
    .bind(
      value.title,
      value.slug,
      value.excerpt,
      JSON.stringify(value.bodyJson),
      bodyHtml,
      value.status,
      value.categoryId,
      value.coverImageId,
      value.publishedAt,
      JSON.stringify(value.metadata),
      now,
      parseOptionalTimestamp(snapshot.deletedAt),
      id,
    )
    .run();

  await replaceContentTags(db, id, value.tagIds, now);
  await replaceContentMediaReferences(
    db,
    id,
    value.bodyJson,
    value.coverImageId,
    now,
  );

  await insertContentVersion(
    db,
    id,
    nextVersion,
    createSnapshot({
      id,
      ...value,
      author_id: snapshot.authorId,
      created_at: snapshot.createdAt,
      updated_at: now,
      deleted_at: snapshot.deletedAt,
    }),
    authorId,
    now,
  );

  await invalidateContentCache(id, cacheKv);

  return { restored: true, id, version };
}

export async function invalidateContentCache(
  id: string,
  cacheKv?: KVNamespace,
): Promise<void> {
  const cache = getCacheService(CACHE_CONFIGS.api!, cacheKv);
  await cache.delete(contentsCacheKeys.item(id));
  await cache.invalidate(contentsCacheKeys.filteredPattern());
}

async function normalizeAndValidateContentInput(
  db: D1Database,
  input: NormalizedContentInput,
): Promise<
  | { value: NormalizedContentInput; error?: never }
  | { value?: never; error: string }
> {
  const tagIds = Array.from(new Set(input.tagIds.filter(Boolean)));
  const categoryId = input.categoryId || null;
  const coverImageId = input.coverImageId || null;
  const bodyJson = input.bodyJson ?? cloneEmptyTiptapDocument();
  const bodyMediaIds = extractBodyMediaIds(bodyJson);

  if (categoryId) {
    const category = await db
      .prepare("SELECT id FROM categories WHERE id = ?")
      .bind(categoryId)
      .first();
    if (!category) return { error: "Category not found" };
  }

  if (coverImageId) {
    const media = await db
      .prepare("SELECT id FROM media WHERE id = ? AND deleted_at IS NULL")
      .bind(coverImageId)
      .first();
    if (!media) return { error: "Cover image not found" };
  }

  if (bodyMediaIds.length > 0) {
    const placeholders = bodyMediaIds.map(() => "?").join(",");
    const row = (await db
      .prepare(
        `SELECT COUNT(*) as count FROM media WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      )
      .bind(...bodyMediaIds)
      .first()) as any;
    if (Number(row?.count || 0) !== bodyMediaIds.length) {
      return { error: "One or more body media items were not found" };
    }
  }

  if (tagIds.length > 0) {
    const placeholders = tagIds.map(() => "?").join(",");
    const row = (await db
      .prepare(
        `SELECT COUNT(*) as count FROM tags WHERE id IN (${placeholders})`,
      )
      .bind(...tagIds)
      .first()) as any;
    if (Number(row?.count || 0) !== tagIds.length)
      return { error: "One or more tags were not found" };
  }

  return {
    value: {
      ...input,
      categoryId,
      coverImageId,
      tagIds,
      metadata: input.metadata ?? {},
      excerpt: input.excerpt ?? null,
      bodyJson,
    },
  };
}

async function replaceContentTags(
  db: D1Database,
  contentId: string,
  tagIds: string[],
  now: number,
): Promise<void> {
  await db
    .prepare("DELETE FROM content_tags WHERE content_id = ?")
    .bind(contentId)
    .run();
  for (const tagId of tagIds) {
    await db
      .prepare(
        "INSERT INTO content_tags (content_id, tag_id, created_at) VALUES (?, ?, ?)",
      )
      .bind(contentId, tagId, now)
      .run();
  }
}

export function extractBodyMediaIds(bodyJson: JSONContent): string[] {
  const ids = new Set<string>();

  function walk(value: unknown): void {
    if (!value || typeof value !== "object") return;

    const node = value as {
      type?: unknown;
      attrs?: { mediaId?: unknown };
      content?: unknown;
    };

    const mediaId = node.attrs?.mediaId;
    if (node.type === "image" && typeof mediaId === "string" && mediaId.trim()) {
      ids.add(mediaId.trim());
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child);
    }
  }

  walk(bodyJson);
  return [...ids];
}

async function replaceContentMediaReferences(
  db: D1Database,
  contentId: string,
  bodyJson: JSONContent,
  coverImageId: string | null,
  now: number,
): Promise<void> {
  await deleteContentMediaReferences(db, contentId);

  const references: Array<{ mediaId: string; usageType: MediaUsageType }> = [
    ...extractBodyMediaIds(bodyJson).map((mediaId) => ({
      mediaId,
      usageType: "body" as const,
    })),
  ];

  if (coverImageId) {
    references.push({ mediaId: coverImageId, usageType: "cover" });
  }

  for (const reference of references) {
    await db
      .prepare(
        `
        INSERT INTO content_media_references
          (content_id, media_id, usage_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      )
      .bind(contentId, reference.mediaId, reference.usageType, now, now)
      .run();
  }
}

async function deleteContentMediaReferences(
  db: D1Database,
  contentId: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM content_media_references WHERE content_id = ?")
    .bind(contentId)
    .run();
}

async function getContentTagIds(
  db: D1Database,
  contentId: string,
): Promise<string[]> {
  const { results } = await db
    .prepare(
      "SELECT tag_id FROM content_tags WHERE content_id = ? ORDER BY tag_id",
    )
    .bind(contentId)
    .all();
  return (results || []).map((row: any) => String(row.tag_id));
}

async function insertContentVersion(
  db: D1Database,
  contentId: string,
  version: number,
  snapshot: ContentSnapshot,
  authorId: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO content_versions (id, content_id, version, data, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      crypto.randomUUID(),
      contentId,
      version,
      JSON.stringify(snapshot),
      authorId,
      now,
    )
    .run();
}

function createSnapshot(row: any): ContentSnapshot {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? null,
    bodyJson: parseJsonContent(row.bodyJson ?? row.body_json),
    status: row.status,
    categoryId: row.categoryId ?? row.category_id ?? null,
    coverImageId: row.coverImageId ?? row.cover_image_id ?? null,
    tagIds: row.tagIds ?? [],
    metadata: row.metadata ?? {},
    publishedAt: toIsoString(row.publishedAt ?? row.published_at),
    authorId: row.authorId ?? row.author_id,
    createdAt:
      toIsoString(row.createdAt ?? row.created_at) ?? new Date(0).toISOString(),
    updatedAt:
      toIsoString(row.updatedAt ?? row.updated_at) ?? new Date(0).toISOString(),
    deletedAt: toIsoString(row.deletedAt ?? row.deleted_at),
  };
}

function parseSnapshot(data: unknown): ContentSnapshot {
  if (typeof data === "object" && data) {
    const snapshot = data as Partial<ContentSnapshot>;
    return {
      ...snapshot,
      bodyJson: parseJsonContent(snapshot.bodyJson),
    } as ContentSnapshot;
  }

  try {
    const snapshot = JSON.parse(String(data)) as Partial<ContentSnapshot> & {
      body?: string;
    };
    return {
      ...snapshot,
      bodyJson: parseJsonContent(snapshot.bodyJson),
    } as ContentSnapshot;
  } catch {
    return {
      id: "",
      title: "Untitled",
      slug: "untitled",
      excerpt: null,
      bodyJson: cloneEmptyTiptapDocument(),
      status: "draft",
      categoryId: null,
      coverImageId: null,
      tagIds: [],
      metadata: {},
      publishedAt: null,
      authorId: "",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      deletedAt: null,
    };
  }
}

function hasContentChanged(
  existing: any,
  existingTagIds: string[],
  next: NormalizedContentInput,
): boolean {
  return (
    next.title !== existing.title ||
    next.slug !== existing.slug ||
    (next.excerpt ?? null) !== (existing.excerpt ?? null) ||
    JSON.stringify(next.bodyJson) !==
      JSON.stringify(parseJsonContent(existing.body_json)) ||
    next.status !== existing.status ||
    (next.categoryId ?? null) !== (existing.category_id ?? null) ||
    (next.coverImageId ?? null) !== (existing.cover_image_id ?? null) ||
    Number(next.publishedAt ?? 0) !== Number(existing.published_at ?? 0) ||
    JSON.stringify(next.metadata) !==
      JSON.stringify(parseJsonObject(existing.metadata)) ||
    JSON.stringify([...next.tagIds].sort()) !==
      JSON.stringify([...existingTagIds].sort())
  );
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object")
    return value as Record<string, unknown>;
  if (!value) return {};
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function parseJsonContent(value: unknown): JSONContent {
  if (isJsonContent(value)) return value;
  if (!value) return cloneEmptyTiptapDocument();

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return isJsonContent(parsed) ? parsed : cloneEmptyTiptapDocument();
  } catch {
    return cloneEmptyTiptapDocument();
  }
}

function isJsonContent(value: unknown): value is JSONContent {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "doc",
  );
}

function cloneEmptyTiptapDocument(): JSONContent {
  return JSON.parse(JSON.stringify(emptyTiptapDocument)) as JSONContent;
}

function parseOptionalTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const timestamp = Date.parse(String(value));
  return Number.isNaN(timestamp) ? null : timestamp;
}

function toIsoString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const timestamp = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function normalizeSlug(slug: string, options: { trim?: boolean } = {}): string {
  const normalized = slug
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return options.trim ? normalized.replace(/^-+|-+$/g, "") : normalized;
}
