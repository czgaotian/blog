import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  invalidateQueries: vi.fn(),
  adminFetch: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}))

vi.mock('./client', () => ({
  adminFetch: mocks.adminFetch,
}))

import {
  useBulkDeleteMedia,
  useMediaList,
  uploadMediaFile,
  useUploadMedia,
  useUpdateMedia,
} from './media'

describe('media api hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useQuery.mockImplementation((config) => config)
    mocks.useMutation.mockImplementation((config) => config)
  })

  it('constructs media list query strings from filters', async () => {
    mocks.adminFetch.mockResolvedValue({ items: [], total: 0, page: 2, limit: 12, types: [] })

    const query = useMediaList({
      page: 2,
      limit: 12,
      type: 'images',
      search: 'hero image',
    }) as any

    await query.queryFn()

    expect(query.queryKey).toEqual(['admin', 'media', {
      page: 2,
      limit: 12,
      type: 'images',
      search: 'hero image',
    }])
    expect(mocks.adminFetch).toHaveBeenCalledWith('/api/media?page=2&limit=12&type=images&search=hero+image')
  })

  it('supports audio media list filters', async () => {
    mocks.adminFetch.mockResolvedValue({ items: [], total: 0, page: 1, limit: 24, types: [] })

    const query = useMediaList({ type: 'audio' }) as any

    await query.queryFn()

    expect(mocks.adminFetch).toHaveBeenCalledWith('/api/media?type=audio')
  })

  it('supports other media list filters', async () => {
    mocks.adminFetch.mockResolvedValue({ items: [], total: 0, page: 1, limit: 24, types: [] })

    const query = useMediaList({ type: 'other' }) as any

    await query.queryFn()

    expect(mocks.adminFetch).toHaveBeenCalledWith('/api/media?type=other')
  })

  it('uploads FormData and invalidates media queries', async () => {
    mocks.adminFetch.mockResolvedValue({ success: true, uploaded: [], errors: [], summary: { total: 0, successful: 0, failed: 0 } })

    const mutation = useUploadMedia() as any
    const formData = new FormData()
    await mutation.mutationFn(formData)
    mutation.onSuccess()

    expect(mocks.adminFetch).toHaveBeenCalledWith('/api/media/upload-multiple', {
      method: 'POST',
      body: formData,
    })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin', 'media'] })
  })

  it('uploads a single media file with progress and abort support', async () => {
    const response = {
      success: true,
      uploaded: [],
      errors: [],
      summary: { total: 1, successful: 1, failed: 0 },
    }
    const onProgress = vi.fn()
    const abortController = new AbortController()
    const file = new File(['image'], 'image.png', { type: 'image/png' })
    mocks.adminFetch.mockResolvedValue(response)

    await expect(
      uploadMediaFile(file, {
        onProgress,
        signal: abortController.signal,
      }),
    ).resolves.toBe(response)

    expect(mocks.adminFetch).toHaveBeenCalledWith('/api/media/upload', {
      method: 'POST',
      body: expect.any(FormData),
      signal: abortController.signal,
    })
    expect(onProgress).toHaveBeenCalledWith({ progress: 5 })
    expect(onProgress).toHaveBeenCalledWith({ progress: 100 })
  })

  it('updates metadata and invalidates list plus detail queries', async () => {
    mocks.adminFetch.mockResolvedValue({ success: true, message: 'ok' })

    const mutation = useUpdateMedia('media-1') as any
    await mutation.mutationFn({ alt: 'Hero', caption: null, tags: ['hero'] })
    mutation.onSuccess()

    expect(mocks.adminFetch).toHaveBeenCalledWith('/api/media/media-1', {
      method: 'PATCH',
      body: JSON.stringify({ alt: 'Hero', caption: null, tags: ['hero'] }),
    })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin', 'media'] })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin', 'media', 'media-1'] })
  })

  it('posts bulk delete requests', async () => {
    mocks.adminFetch.mockResolvedValue({ success: true, summary: { total: 1, successful: 1, failed: 0 } })

    const remove = useBulkDeleteMedia() as any

    await remove.mutationFn({ fileIds: ['media-1'] })

    expect(mocks.adminFetch).toHaveBeenCalledWith('/api/media/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ fileIds: ['media-1'] }),
    })
  })
})
