import { useState } from 'react'
import { useMediaList } from '../api/media'
import type { MediaItem } from '@worker-blog/shared/admin-api'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'
import { Pagination } from '../components/ui/pagination'
import { FilterBar } from '../components/ui/filter-bar'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function MediaCard({ item }: { item: MediaItem }) {
  return (
    <div className="group rounded-lg border border-border bg-card overflow-hidden">
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {item.isImage ? (
          <img
            src={item.thumbnailUrl ?? item.publicUrl}
            alt={item.alt ?? item.originalName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 p-2 text-center">
            <span className="text-2xl">{item.isVideo ? '🎬' : '📄'}</span>
            <span className="text-xs text-muted-foreground truncate w-full px-1">
              {item.mimeType}
            </span>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-medium truncate" title={item.originalName}>
          {item.originalName}
        </p>
        <p className="text-xs text-muted-foreground">{formatFileSize(item.size)}</p>
      </div>
    </div>
  )
}

export function MediaLibraryPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const limit = 24
  const { data, isLoading, isError } = useMediaList({ page, limit, search, type })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1

  return (
    <section className="space-y-6">
      <PageHeader title="Media" description="Browse and manage uploaded media files." />

      <div className="flex flex-wrap gap-2">
        {['', 'images', 'videos', 'documents'].map(t => (
          <button
            key={t}
            onClick={() => { setType(t); setPage(1) }}
            className={`rounded-full px-3 py-1 text-sm border transition-colors ${
              type === t
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
          >
            {t === '' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <FilterBar
        searchLabel="Search by filename…"
        onSubmit={(e) => {
          e.preventDefault()
          const q = new FormData(e.currentTarget).get('q') as string
          setSearch(q || '')
          setPage(1)
        }}
      />

      {data && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          {data.types.map(t => (
            <span key={t.type}>{t.type}: <strong className="text-foreground">{t.count}</strong></span>
          ))}
        </div>
      )}

      {isLoading && <LoadingState label="Loading media" />}

      {isError && (
        <Alert title="Failed to load media" tone="danger">
          Could not fetch media. Try refreshing the page.
        </Alert>
      )}

      {data && data.items.length === 0 && !isLoading && (
        <p className="text-center text-muted-foreground py-12">No media files found.</p>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {data.items.map(item => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>

          <Pagination
            page={page}
            pageCount={totalPages}
            previousHref={page > 1 ? `?page=${page - 1}` : undefined}
            nextHref={page < totalPages ? `?page=${page + 1}` : undefined}
          />
        </>
      )}
    </section>
  )
}
