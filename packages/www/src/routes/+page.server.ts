import { fetchContents } from '$lib/server/api'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch }) => {
  return fetchContents(fetch)
}
