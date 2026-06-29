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
