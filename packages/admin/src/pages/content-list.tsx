import { useState } from 'react'
import { useContentList } from '../api/content'
import type { ContentStatus } from '@worker-blog/shared/admin-api'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Pagination } from '../components/ui/pagination'
import { FilterBar } from '../components/ui/filter-bar'
import { Link } from 'react-router'

const STATUS_COLORS: Record<ContentStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  archived: 'bg-muted text-muted-foreground opacity-60',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export function ContentListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading, isError } = useContentList({ page, limit: 20, search })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 20)) : 1

  return (
    <section className="space-y-6">
      <PageHeader title="Content" description="Manage content items across all collections." />

      <FilterBar
        searchLabel="Search by title or slug…"
        onSubmit={(e) => {
          e.preventDefault()
          const q = new FormData(e.currentTarget).get('q') as string
          setSearch(q || '')
          setPage(1)
        }}
      />

      {isLoading && <LoadingState label="Loading content" />}

      {isError && (
        <Alert title="Failed to load content" tone="danger">
          Could not fetch content. Try refreshing the page.
        </Alert>
      )}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Collection</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground" colSpan={5}>
                    No content found.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-muted text-muted-foreground">
                        {item.collectionDisplayName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[item.status]}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{item.authorName}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            pageCount={totalPages}
            previousHref={page > 1 ? `?page=${page - 1}&q=${encodeURIComponent(search)}` : undefined}
            nextHref={page < totalPages ? `?page=${page + 1}&q=${encodeURIComponent(search)}` : undefined}
          />
        </>
      )}
    </section>
  )
}
