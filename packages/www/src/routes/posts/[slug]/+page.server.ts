import { fetchContentBySlug } from "$lib/server/api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, params }) => {
  return fetchContentBySlug(fetch, params.slug);
};
