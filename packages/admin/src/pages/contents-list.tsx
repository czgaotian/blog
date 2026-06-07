import { useState } from 'react'
import type { ContentListItem, ContentStatus } from '@worker-blog/shared/admin-api'
import { Edit, Plus, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { useDeleteContents, useContentsList } from '../api/contents'
import { useCategoriesList, useTagsList } from '../api/taxonomies'
import { AdminApiError } from '../api/client'
import { PageHeader } from '../components/page-header'
import { ConfirmDialog } from '../components/content/confirm-dialog'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Pagination } from '../components/ui/pagination'
import { FilterBar } from '../components/ui/filter-bar'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import {
  readContentListFilters,
  writeContentListFilters,
  type ContentListFilters,
} from '../lib/content-list-filters'

const STATUS_COLORS: Record<ContentStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  archived: 'bg-muted text-muted-foreground opacity-60',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export function ContentsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readContentListFilters(searchParams)
  const categories = useCategoriesList()
  const tags = useTagsList()
  const { data, isLoading, isError } = useContentsList({
    page: filters.page,
    limit: 20,
    search: filters.search,
    status: filters.status === 'all' ? undefined : filters.status,
    categoryId: filters.categoryId,
    tagId: filters.tagId,
  })
  const [deleting, setDeleting] = useState<ContentListItem | null>(null)
  const deleteMutation = useDeleteContents(deleting?.id ?? '')
  const totalPages = data ? Math.max(1, Math.ceil(data.total / 20)) : 1

  function updateFilters(patch: Partial<ContentListFilters>) {
    setSearchParams(writeContentListFilters({ ...filters, page: 1, ...patch }))
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync()
      setDeleting(null)
    } catch {
      // Mutation error is displayed in the dialog.
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Content"
        description="Manage blog content."
        actions={<Button asChild><Link to="/contents/new"><Plus />New content</Link></Button>}
      />

      <FilterBar
        key={filters.search}
        searchLabel="Search by title or slug…"
        searchValue={filters.search}
        onSubmit={(event) => {
          event.preventDefault()
          const query = String(new FormData(event.currentTarget).get('q') || '')
          updateFilters({ search: query })
        }}
      >
        <Select value={filters.status} onValueChange={(status) => updateFilters({ status: status as ContentListFilters['status'] })}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">In review</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={filters.categoryId || 'all'} onValueChange={(value) => updateFilters({ categoryId: value === 'all' ? '' : value })}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All categories</SelectItem>
              {categories.data?.items.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={filters.tagId || 'all'} onValueChange={(value) => updateFilters({ tagId: value === 'all' ? '' : value })}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="All tags" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All tags</SelectItem>
              {tags.data?.items.map((tag) => <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FilterBar>

      {isLoading ? <LoadingState label="Loading content" /> : null}
      {isError ? <Alert title="Failed to load content" tone="danger">Could not fetch content. Try refreshing the page.</Alert> : null}

      {data ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 ? (
                <TableRow><TableCell className="text-center text-muted-foreground" colSpan={6}>No content found.</TableCell></TableRow>
              ) : data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link className="block min-w-0 hover:underline" to={`/contents/${item.id}`}>
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.slug}</p>
                    </Link>
                  </TableCell>
                  <TableCell><Badge className={STATUS_COLORS[item.status]}>{item.status}</Badge></TableCell>
                  <TableCell className="text-sm">{item.category?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm">{item.authorName}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(item.updatedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild size="icon" variant="ghost" aria-label={`Edit ${item.title}`}>
                        <Link to={`/contents/${item.id}`}><Edit /></Link>
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={`Delete ${item.title}`} onClick={() => setDeleting(item)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            page={filters.page}
            pageCount={totalPages}
            hrefForPage={(pageNumber) => `?${writeContentListFilters({ ...filters, page: pageNumber })}`}
            previousHref={filters.page > 1 ? `?${writeContentListFilters({ ...filters, page: filters.page - 1 })}` : undefined}
            nextHref={filters.page < totalPages ? `?${writeContentListFilters({ ...filters, page: filters.page + 1 })}` : undefined}
          />
        </>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete content?"
        confirmLabel="Delete content"
        pendingLabel="Deleting..."
        destructive
        pending={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      >
        {deleteMutation.isError ? (
          <Alert title="Could not delete content" tone="danger">
            {deleteMutation.error instanceof AdminApiError ? deleteMutation.error.message : 'Unexpected error'}
          </Alert>
        ) : (
          <>“{deleting?.title}” will be moved to the deleted content view.</>
        )}
      </ConfirmDialog>
    </section>
  )
}
