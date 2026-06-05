import type {
  CreateTagRequest,
  TagDetailResponse,
  UpdateTagRequest,
} from '@worker-blog/shared/admin-api'
import { z } from 'zod'

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color')

export const tagFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  slug: z.string().trim().max(255),
  description: z.string().max(1000, 'Description must be 1,000 characters or fewer'),
  color: hexColorSchema,
})

export type TagFormValues = z.infer<typeof tagFormSchema>

export const EMPTY_TAG_FORM_VALUES: TagFormValues = {
  name: '',
  slug: '',
  description: '',
  color: '#64748b',
}

export function detailToTagFormValues(detail: TagDetailResponse): TagFormValues {
  return {
    name: detail.name,
    slug: detail.slug,
    description: detail.description ?? '',
    color: detail.color,
  }
}

export function tagFormToCreateRequest(values: TagFormValues): CreateTagRequest {
  return {
    name: values.name.trim(),
    ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
    description: values.description.trim() || null,
    color: values.color.trim(),
  }
}

export function tagFormToUpdateRequest(values: TagFormValues): UpdateTagRequest {
  return {
    name: values.name.trim(),
    ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
    description: values.description.trim() || null,
    color: values.color.trim(),
  }
}
