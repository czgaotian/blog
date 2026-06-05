import type {
  CategoryDetailResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@worker-blog/shared/admin-api'
import { z } from 'zod'

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  slug: z.string().trim().max(255),
  description: z.string().max(1000, 'Description must be 1,000 characters or fewer'),
  parentId: z.string(),
  sortOrder: z.number().int('Sort order must be a whole number'),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>

export const EMPTY_CATEGORY_FORM_VALUES: CategoryFormValues = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  sortOrder: 0,
}

export function detailToCategoryFormValues(detail: CategoryDetailResponse): CategoryFormValues {
  return {
    name: detail.name,
    slug: detail.slug,
    description: detail.description ?? '',
    parentId: detail.parentId ?? '',
    sortOrder: detail.sortOrder,
  }
}

export function categoryFormToCreateRequest(values: CategoryFormValues): CreateCategoryRequest {
  return {
    name: values.name.trim(),
    ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
    description: values.description.trim() || null,
    parentId: values.parentId || null,
    sortOrder: values.sortOrder,
  }
}

export function categoryFormToUpdateRequest(values: CategoryFormValues): UpdateCategoryRequest {
  return {
    name: values.name.trim(),
    ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
    description: values.description.trim() || null,
    parentId: values.parentId || null,
    sortOrder: values.sortOrder,
  }
}
