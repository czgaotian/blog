import { error } from "@sveltejs/kit";
import type {
  PublicCategoryContentsResponse,
  PublicContentDetailResponse,
  PublicContentListResponse,
  PublicTagContentsResponse,
} from "@worker-blog/shared/public-api";
import { env } from "$env/dynamic/private";

type SvelteFetch = typeof fetch;

function requireApiBaseUrl() {
  if (!env.API_BASE_URL) throw error(500, "API_BASE_URL is not configured");
  return env.API_BASE_URL.replace(/\/$/, "");
}

async function getJson<T>(eventFetch: SvelteFetch, path: string): Promise<T> {
  const res = await eventFetch(`${requireApiBaseUrl()}${path}`);
  if (res.status === 404) throw error(404, "Not found");
  if (!res.ok) throw error(res.status, "API request failed");
  return res.json() as Promise<T>;
}

export function fetchContents(eventFetch: SvelteFetch) {
  return getJson<PublicContentListResponse>(eventFetch, "/api/contents");
}

export function fetchContentBySlug(eventFetch: SvelteFetch, slug: string) {
  return getJson<PublicContentDetailResponse>(
    eventFetch,
    `/api/contents/slug/${encodeURIComponent(slug)}`,
  );
}

export function fetchCategoryContents(eventFetch: SvelteFetch, slug: string) {
  return getJson<PublicCategoryContentsResponse>(
    eventFetch,
    `/api/category/${encodeURIComponent(slug)}`,
  );
}

export function fetchTagContents(eventFetch: SvelteFetch, slug: string) {
  return getJson<PublicTagContentsResponse>(eventFetch, `/api/tag/${encodeURIComponent(slug)}`);
}
