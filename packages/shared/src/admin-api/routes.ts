import type { RouteMetadata } from '@worker-blog/shared/routes'

export interface ApiReferenceResponse {
  endpoints: RouteMetadata[]
  version: string
}
