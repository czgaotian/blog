# WWW Architecture

## Scope

`packages/www` is the public blog frontend. It is an independent SvelteKit SSR
application deployed to Vercel with `@sveltejs/adapter-vercel`.

The app does not access the database and does not depend on Cloudflare bindings.
It reads data only through public APIs exposed by `packages/server`, which is
deployed to Cloudflare.

## Pages

The first version includes only these public pages:

- `/`: published content list.
- `/posts/[slug]`: content detail page. SSR fetches the content by slug and
  renders `bodyHtml`.
- `/categories/[slug]`: published contents in a category.
- `/tags/[slug]`: published contents with a tag.
- 404 and error pages.

## API Contract

Existing public APIs are reused for list, category, and tag pages:

- `GET /api/contents`
- `GET /api/category/:slug`
- `GET /api/tag/:slug`

Because the public article URL uses a slug, the backend needs one minimal public
detail endpoint:

- `GET /api/contents/slug/:slug`

The slug detail endpoint returns only published content and includes `bodyHtml`
for rendering. It must not require database migrations.

## Configuration

`packages/www` reads the backend base URL from a server-side environment
variable:

```sh
API_BASE_URL=https://api.example.com
```

SvelteKit server load functions use this value to call the Cloudflare API during
SSR. Browser code should not build backend URLs unless a later client-side
interaction needs it.

## Deferred

The first version skips:

- BFF proxy routes in `packages/www`.
- Static prerendering.
- Search.
- Archive pages.
- About page.
