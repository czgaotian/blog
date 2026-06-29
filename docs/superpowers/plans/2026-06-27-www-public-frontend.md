# WWW Public Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `packages/www` as the public SvelteKit SSR blog frontend described in `packages/www/docs/architecture.md`.

**Architecture:** `packages/www` is an independent SvelteKit SSR app deployed to Vercel. It reads only public HTTP APIs from `packages/server`; it does not import server DB code, Cloudflare bindings, or admin UI code.

**Tech Stack:** SvelteKit, `@sveltejs/adapter-vercel`, TypeScript, Vitest, `@worker-blog/shared`, existing Hono public API in `packages/server`.

## Global Constraints

- Do not modify existing migration files.
- Put reusable API contracts and route-independent types in `packages/shared`.
- Keep Cloudflare/D1/Hono-specific implementation inside `packages/server`.
- Keep SvelteKit page and presentation code inside `packages/www`.
- Use `API_BASE_URL` only from server-side SvelteKit code.
- Do not add BFF proxy routes, static prerendering, search, archive pages, or about page in v1.

---

## File Structure

- Create: `packages/shared/src/public-api/contents.ts`
  - Public content response types used by server tests and www fetch code.
- Create: `packages/shared/src/public-api/index.ts`
  - Public API contract barrel export.
- Modify: `packages/shared/src/index.ts`
  - Export public API contracts from the package root.
- Create: `packages/shared/src/public-api/contents.test.ts`
  - Small type/runtime shape checks for the public contracts.
- Modify: `packages/server/src/routes/api-contents-crud.ts`
  - Add `GET /api/contents/slug/:slug` before `/:id`.
- Create: `packages/server/src/routes/api-contents-crud.test.ts`
  - Focused public detail endpoint tests.
- Create: `packages/www/package.json`
  - Independent SvelteKit app scripts and dependencies.
- Create: `packages/www/svelte.config.js`
  - Vercel adapter config.
- Create: `packages/www/vite.config.ts`
  - SvelteKit + Vitest config.
- Create: `packages/www/tsconfig.json`
  - SvelteKit TypeScript config.
- Create: `packages/www/src/app.d.ts`
  - SvelteKit app typing.
- Create: `packages/www/src/app.html`
  - SvelteKit HTML shell.
- Create: `packages/www/src/lib/server/api.ts`
  - SSR-only API fetch helper using `API_BASE_URL`.
- Create: `packages/www/src/lib/content.ts`
  - UI-independent formatting helpers local to www.
- Create: `packages/www/src/lib/content.test.ts`
  - Small tests for formatting helpers.
- Create: `packages/www/src/routes/+layout.svelte`
  - Shared public page shell.
- Create: `packages/www/src/routes/+page.server.ts`
  - SSR load for `/`.
- Create: `packages/www/src/routes/+page.svelte`
  - Published content list page.
- Create: `packages/www/src/routes/posts/[slug]/+page.server.ts`
  - SSR load for post detail.
- Create: `packages/www/src/routes/posts/[slug]/+page.svelte`
  - Detail page rendering `bodyHtml`.
- Create: `packages/www/src/routes/categories/[slug]/+page.server.ts`
  - SSR load for category list.
- Create: `packages/www/src/routes/categories/[slug]/+page.svelte`
  - Category listing page.
- Create: `packages/www/src/routes/tags/[slug]/+page.server.ts`
  - SSR load for tag list.
- Create: `packages/www/src/routes/tags/[slug]/+page.svelte`
  - Tag listing page.
- Create: `packages/www/src/routes/+error.svelte`
  - Error and 404 rendering.

## Task 1: Shared Public API Contracts

**Files:**
- Create: `packages/shared/src/public-api/contents.ts`
- Create: `packages/shared/src/public-api/index.ts`
- Create: `packages/shared/src/public-api/contents.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces:
  - `PublicTaxonomySummary`
  - `PublicContentListItem`
  - `PublicContentDetail`
  - `PublicContentListResponse`
  - `PublicContentDetailResponse`
  - `PublicCategoryContentsResponse`
  - `PublicTagContentsResponse`

- [ ] **Step 1: Write the contract file**

Use these shapes; keep snake_case fields because current public API already returns them:

```ts
export interface PublicTaxonomySummary {
  id: string
  name: string
  slug: string
  description?: string | null
}

export interface PublicContentListItem {
  id: string
  title: string
  slug: string
  excerpt: string | null
  status: 'published'
  cover_image_id: string | null
  category?: PublicTaxonomySummary | null
  tags?: PublicTaxonomySummary[]
  metadata?: Record<string, unknown>
  published_at: number | null
  created_at: number
  updated_at: number
}

export interface PublicContentDetail extends PublicContentListItem {
  bodyHtml: string
}

export interface PublicContentListResponse {
  data: PublicContentListItem[]
  meta?: Record<string, unknown>
}

export interface PublicContentDetailResponse {
  data: PublicContentDetail
}

export interface PublicCategoryContentsResponse {
  category: PublicTaxonomySummary
  data: PublicContentListItem[]
}

export interface PublicTagContentsResponse {
  tag: PublicTaxonomySummary
  data: PublicContentListItem[]
}
```

- [ ] **Step 2: Add exports**

`packages/shared/src/public-api/index.ts`:

```ts
export * from './contents'
```

`packages/shared/src/index.ts`:

```ts
export * from './public-api'
```

- [ ] **Step 3: Add a small contract test**

```ts
import { describe, expect, it } from 'vitest'
import type { PublicContentDetailResponse } from './contents'

describe('public content contracts', () => {
  it('keeps public detail body as rendered HTML only', () => {
    const response: PublicContentDetailResponse = {
      data: {
        id: 'c1',
        title: 'Hello',
        slug: 'hello',
        excerpt: null,
        status: 'published',
        cover_image_id: null,
        metadata: {},
        published_at: 1700000000,
        created_at: 1700000000,
        updated_at: 1700000000,
        bodyHtml: '<p>Hello</p>',
      },
    }

    expect(response.data.bodyHtml).toBe('<p>Hello</p>')
    expect(response.data).not.toHaveProperty('bodyJson')
  })
})
```

- [ ] **Step 4: Verify shared package**

Run:

```sh
pnpm --filter @worker-blog/shared test -- contents.test.ts
```

Expected: PASS.

## Task 2: Public Slug Detail Endpoint

**Files:**
- Modify: `packages/server/src/routes/api-contents-crud.ts`
- Create: `packages/server/src/routes/api-contents-crud.test.ts`

**Interfaces:**
- Consumes: `PublicContentDetailResponse` from `@worker-blog/shared`.
- Produces: `GET /api/contents/slug/:slug`.

- [ ] **Step 1: Write endpoint tests**

Cover these cases:

```ts
import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import apiContentsCrudRoutes from './api-contents-crud'

const publishedRow = {
  id: 'c1',
  title: 'Published Post',
  slug: 'published-post',
  excerpt: 'Short',
  body_html: '<p>Published</p>',
  status: 'published',
  cover_image_id: null,
  metadata: '{}',
  published_at: 1700000000,
  created_at: 1700000000,
  updated_at: 1700000000,
  deleted_at: null,
}

function createApp(row: any) {
  const app = new Hono()
  const db = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("slug = ?") && args[0] === 'published-post') return row
          return null
        },
      }),
    }),
  }
  app.route('/api/contents', apiContentsCrudRoutes)
  return { app, env: { DB: db } }
}

describe('GET /api/contents/slug/:slug', () => {
  it('returns published content by slug with bodyHtml', async () => {
    const { app, env } = createApp(publishedRow)
    const res = await app.request('/api/contents/slug/published-post', {}, env)
    const json = await res.json() as any

    expect(res.status).toBe(200)
    expect(json.data.slug).toBe('published-post')
    expect(json.data.bodyHtml).toBe('<p>Published</p>')
    expect(json.data).not.toHaveProperty('bodyJson')
  })

  it('returns 404 when slug is missing or unpublished', async () => {
    const { app, env } = createApp(null)
    const res = await app.request('/api/contents/slug/draft-post', {}, env)

    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Add the route before `/:id`**

In `packages/server/src/routes/api-contents-crud.ts`, add the slug route above `apiContentsCrudRoutes.get('/:id', ...)`:

```ts
apiContentsCrudRoutes.get('/slug/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')
    if (!slug) return c.json({ error: 'Content slug is required' }, 400)

    const content = await c.env.DB
      .prepare("SELECT * FROM contents WHERE slug = ? AND status = 'published' AND deleted_at IS NULL")
      .bind(slug)
      .first()

    if (!content) return c.json({ error: 'Content not found' }, 404)

    return c.json({ data: mapPublicContentDetail(content) })
  } catch (error) {
    console.error('Error fetching content by slug:', error)
    return c.json({
      error: 'Failed to fetch content',
      details: error instanceof Error ? error.message : String(error),
    }, 500)
  }
})
```

Extract the existing detail object into a shared local helper:

```ts
function mapPublicContentDetail(content: any) {
  return {
    id: content.id,
    title: content.title,
    slug: content.slug,
    excerpt: content.excerpt ?? null,
    bodyHtml: content.body_html ?? '',
    status: content.status,
    cover_image_id: content.cover_image_id ?? null,
    metadata: parseJsonObject(content.metadata),
    published_at: content.published_at,
    created_at: content.created_at,
    updated_at: content.updated_at,
  }
}
```

- [ ] **Step 3: Reuse the helper in the ID route**

Replace the duplicated `transformedContent` object in `GET /:id` with:

```ts
return c.json({ data: mapPublicContentDetail(content) })
```

- [ ] **Step 4: Verify server route**

Run:

```sh
pnpm --filter @worker-blog/server test -- api-contents-crud.test.ts
```

Expected: PASS.

## Task 3: Initialize `packages/www`

**Files:**
- Create: `packages/www/package.json`
- Create: `packages/www/svelte.config.js`
- Create: `packages/www/vite.config.ts`
- Create: `packages/www/tsconfig.json`
- Create: `packages/www/src/app.d.ts`
- Create: `packages/www/src/app.html`

**Interfaces:**
- Consumes: `API_BASE_URL`.
- Produces: runnable `@worker-blog/www` package.

- [ ] **Step 1: Add package metadata**

Use current package versions from the lockfile where possible; if SvelteKit packages are not installed yet, add only these dependencies:

```json
{
  "name": "@worker-blog/www",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest --run",
    "type-check": "svelte-kit sync && tsc --noEmit"
  },
  "dependencies": {
    "@worker-blog/shared": "workspace:*",
    "@sveltejs/adapter-vercel": "^5.0.0",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vite": "^8.0.16",
    "vitest": "^4.1.8"
  }
}
```

- [ ] **Step 2: Add SvelteKit config**

```js
import adapter from '@sveltejs/adapter-vercel'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  },
}

export default config
```

- [ ] **Step 3: Add Vite config**

```ts
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Add TypeScript and app shell**

`tsconfig.json`:

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

`src/app.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

- [ ] **Step 5: Install and sync**

Run:

```sh
pnpm install
pnpm --filter @worker-blog/www type-check
```

Expected: type-check passes after `svelte-kit sync`.

## Task 4: WWW API Client And Formatting Helpers

**Files:**
- Create: `packages/www/src/lib/server/api.ts`
- Create: `packages/www/src/lib/content.ts`
- Create: `packages/www/src/lib/content.test.ts`

**Interfaces:**
- Consumes: public contracts from `@worker-blog/shared`.
- Produces:
  - `fetchContents(fetch): Promise<PublicContentListResponse>`
  - `fetchContentBySlug(fetch, slug): Promise<PublicContentDetailResponse>`
  - `fetchCategoryContents(fetch, slug): Promise<PublicCategoryContentsResponse>`
  - `fetchTagContents(fetch, slug): Promise<PublicTagContentsResponse>`

- [ ] **Step 1: Add SSR fetch helper**

```ts
import { error } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import type {
  PublicCategoryContentsResponse,
  PublicContentDetailResponse,
  PublicContentListResponse,
  PublicTagContentsResponse,
} from '@worker-blog/shared'

type SvelteFetch = typeof fetch

function requireApiBaseUrl() {
  if (!env.API_BASE_URL) throw error(500, 'API_BASE_URL is not configured')
  return env.API_BASE_URL.replace(/\/$/, '')
}

async function getJson<T>(eventFetch: SvelteFetch, path: string): Promise<T> {
  const res = await eventFetch(`${requireApiBaseUrl()}${path}`)
  if (res.status === 404) throw error(404, 'Not found')
  if (!res.ok) throw error(res.status, 'API request failed')
  return res.json() as Promise<T>
}

export function fetchContents(eventFetch: SvelteFetch) {
  return getJson<PublicContentListResponse>(eventFetch, '/api/contents')
}

export function fetchContentBySlug(eventFetch: SvelteFetch, slug: string) {
  return getJson<PublicContentDetailResponse>(eventFetch, `/api/contents/slug/${encodeURIComponent(slug)}`)
}

export function fetchCategoryContents(eventFetch: SvelteFetch, slug: string) {
  return getJson<PublicCategoryContentsResponse>(eventFetch, `/api/category/${encodeURIComponent(slug)}`)
}

export function fetchTagContents(eventFetch: SvelteFetch, slug: string) {
  return getJson<PublicTagContentsResponse>(eventFetch, `/api/tag/${encodeURIComponent(slug)}`)
}
```

- [ ] **Step 2: Add tiny formatting helper**

```ts
export function formatDate(value: number | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}
```

- [ ] **Step 3: Test timestamp behavior**

```ts
import { describe, expect, it } from 'vitest'
import { formatDate } from './content'

describe('formatDate', () => {
  it('formats epoch millisecond timestamps', () => {
    expect(formatDate(1700000000000)).toBe('Nov 14, 2023')
  })

  it('returns empty string for null dates', () => {
    expect(formatDate(null)).toBe('')
  })
})
```

- [ ] **Step 4: Verify helpers**

Run:

```sh
pnpm --filter @worker-blog/www test -- content.test.ts
```

Expected: PASS.

## Task 5: Public Pages

**Files:**
- Create: `packages/www/src/routes/+layout.svelte`
- Create: `packages/www/src/routes/+page.server.ts`
- Create: `packages/www/src/routes/+page.svelte`
- Create: `packages/www/src/routes/posts/[slug]/+page.server.ts`
- Create: `packages/www/src/routes/posts/[slug]/+page.svelte`
- Create: `packages/www/src/routes/categories/[slug]/+page.server.ts`
- Create: `packages/www/src/routes/categories/[slug]/+page.svelte`
- Create: `packages/www/src/routes/tags/[slug]/+page.server.ts`
- Create: `packages/www/src/routes/tags/[slug]/+page.svelte`
- Create: `packages/www/src/routes/+error.svelte`

**Interfaces:**
- Consumes: API helper functions from Task 4.
- Produces: `/`, `/posts/[slug]`, `/categories/[slug]`, `/tags/[slug]`, 404/error pages.

- [ ] **Step 1: Add server loads**

Home:

```ts
import { fetchContents } from '$lib/server/api'

export async function load({ fetch }) {
  return fetchContents(fetch)
}
```

Post detail:

```ts
import { fetchContentBySlug } from '$lib/server/api'

export async function load({ fetch, params }) {
  return fetchContentBySlug(fetch, params.slug)
}
```

Category:

```ts
import { fetchCategoryContents } from '$lib/server/api'

export async function load({ fetch, params }) {
  return fetchCategoryContents(fetch, params.slug)
}
```

Tag:

```ts
import { fetchTagContents } from '$lib/server/api'

export async function load({ fetch, params }) {
  return fetchTagContents(fetch, params.slug)
}
```

- [ ] **Step 2: Add minimal layout**

Use plain CSS in the Svelte file. Keep it readable and unbranded for v1:

```svelte
<script lang="ts">
  let { children } = $props()
</script>

<header class="site-header">
  <a href="/" class="brand">Worker Blog</a>
</header>

<main>
  {@render children()}
</main>
```

- [ ] **Step 3: Render list cards**

Home, category, and tag pages should render the same fields:

```svelte
<script lang="ts">
  import { formatDate } from '$lib/content'
  let { data } = $props()
</script>

<section>
  {#each data.data as post}
    <article>
      <a href={`/posts/${post.slug}`}>{post.title}</a>
      {#if post.excerpt}<p>{post.excerpt}</p>{/if}
      <time>{formatDate(post.published_at)}</time>
    </article>
  {:else}
    <p>No posts yet.</p>
  {/each}
</section>
```

- [ ] **Step 4: Render detail HTML**

Use Svelte `{@html ...}` only for server-generated sanitized `bodyHtml`:

```svelte
<script lang="ts">
  import { formatDate } from '$lib/content'
  let { data } = $props()
  const post = data.data
</script>

<article>
  <h1>{post.title}</h1>
  <time>{formatDate(post.published_at)}</time>
  {#if post.excerpt}<p>{post.excerpt}</p>{/if}
  <div class="content">
    {@html post.bodyHtml}
  </div>
</article>
```

- [ ] **Step 5: Add error page**

```svelte
<script lang="ts">
  import { page } from '$app/state'
</script>

<h1>{page.status === 404 ? 'Not found' : 'Something went wrong'}</h1>
<p>{page.error?.message ?? 'The page could not be loaded.'}</p>
<a href="/">Back home</a>
```

- [ ] **Step 6: Verify www pages**

Run:

```sh
pnpm --filter @worker-blog/www type-check
pnpm --filter @worker-blog/www build
```

Expected: both pass.

## Task 6: Final Verification

**Files:**
- No new files unless a previous task uncovered a missing test.

**Interfaces:**
- Verifies the whole public frontend path.

- [ ] **Step 1: Run focused checks**

```sh
pnpm --filter @worker-blog/shared test -- contents.test.ts
pnpm --filter @worker-blog/server test -- api-contents-crud.test.ts
pnpm --filter @worker-blog/www test
pnpm --filter @worker-blog/www type-check
pnpm --filter @worker-blog/www build
```

- [ ] **Step 2: Run broad checks if the repo scripts are fixed**

Root `pnpm type-check` is currently known to be blocked by the missing editor tsconfig noted in `task_plan.md`. If that has been fixed by execution time, run:

```sh
pnpm type-check
```

- [ ] **Step 3: Manual smoke test**

Start the API and www in separate terminals:

```sh
pnpm --filter @worker-blog/server dev
API_BASE_URL=http://localhost:8787 pnpm --filter @worker-blog/www dev
```

Open:

- `http://localhost:5173/`
- `http://localhost:5173/posts/<published-slug>`
- `http://localhost:5173/categories/<category-slug>`
- `http://localhost:5173/tags/<tag-slug>`

Expected: pages SSR render published content only; missing slugs show 404.

## Skipped For V1

- BFF proxy routes in `packages/www`; direct SSR fetch is enough.
- Static prerendering; data is API-backed and deployment target is SSR.
- Search, archive, and about pages; architecture explicitly defers them.
- A design system; public v1 needs readable pages, not reusable UI primitives.
