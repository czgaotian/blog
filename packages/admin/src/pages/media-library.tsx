import { useState, type FormEvent } from 'react'
import type { MediaItem, MediaTypeFilter, UploadMediaResponse } from '@worker-blog/shared/admin-api'
import { toast } from 'sonner'
import {
  CircleHelp,
  Copy,
  FileText,
  ImageIcon,
  Music,
  Pencil,
  Trash2,
  Upload,
  Video,
} from 'lucide-react'
import {
  useBulkDeleteMedia,
  useDeleteMedia,
  useMediaList,
  useUpdateMedia,
  useUploadMedia,
} from '../api/media'
import { AdminApiError } from '../api/client'
import { ConfirmDialog } from '../components/content/confirm-dialog'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { Dialog } from '../components/ui/dialog'
import { FilterBar } from '../components/ui/filter-bar'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { LoadingState } from '../components/ui/loading-state'
import { Pagination } from '../components/ui/pagination'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Spinner } from '../components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Textarea } from '../components/ui/textarea'

const mediaTypes: Array<{ value: 'all' | MediaTypeFilter; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'images', label: 'Images' },
  { value: 'videos', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'documents', label: 'Documents' },
  { value: 'other', label: 'Other' },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string): string {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleString()
}

function formatDimensions(item: MediaItem): string {
  return item.width && item.height ? `${item.width} x ${item.height}` : '-'
}

function mutationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AdminApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

async function copyMediaUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    toast.success('Media URL copied')
  } catch {
    toast.error('Could not copy media URL')
  }
}

function mediaKind(item: MediaItem): MediaTypeFilter {
  if (item.isVideo) return 'videos'
  if (item.isImage) return 'images'
  if (item.isAudio) return 'audio'
  if (item.isDocument) return 'documents'
  return 'other'
}

function MediaIcon({ item }: { item: MediaItem }) {
  if (item.isVideo) return <Video />
  if (item.isImage) return <ImageIcon />
  if (item.isAudio) return <Music />
  if (item.isDocument) return <FileText />
  return <CircleHelp />
}

function MediaPreview({ item, onOpen }: { item: MediaItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="flex size-12 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onOpen}
    >
      {item.isImage ? (
        <img
          src={item.thumbnailUrl ?? item.publicUrl}
          alt={item.alt ?? item.originalName}
          className="size-full object-cover"
        />
      ) : (
        <MediaIcon item={item} />
      )}
    </button>
  )
}

interface UploadDialogProps {
  open: boolean
  onClose: () => void
}

function UploadDialog({ open, onClose }: UploadDialogProps) {
  const upload = useUploadMedia()
  const [result, setResult] = useState<UploadMediaResponse | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const response = await upload.mutateAsync(new FormData(form))
    setResult(response)
    if (response.success) form.reset()
  }

  function close() {
    upload.reset()
    setResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={close} title="Upload media" className="max-w-2xl">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="media-files">Files</Label>
          <Input id="media-files" name="files" type="file" multiple required />
        </div>
        {upload.isError ? (
          <Alert title="Upload failed" tone="danger">
            {mutationErrorMessage(upload.error, 'Could not upload files.')}
          </Alert>
        ) : null}
        {result ? (
          <Alert title="Upload complete">
            {result.summary.successful} uploaded, {result.summary.failed} failed.
            {result.errors.length ? ` Failed: ${result.errors.map((error) => error.filename || error.error).join(', ')}` : ''}
          </Alert>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={upload.isPending} onClick={close}>Close</Button>
          <Button type="submit" disabled={upload.isPending}>
            {upload.isPending ? <Spinner /> : <Upload />}
            Upload
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

interface DetailDialogProps {
  item: MediaItem | null
  onClose: () => void
}

function DetailDialog({ item, onClose }: DetailDialogProps) {
  const update = useUpdateMedia(item?.id ?? '')
  const remove = useDeleteMedia(item?.id ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!item) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!item) return
    const data = new FormData(event.currentTarget)
    const tags = String(data.get('tags') || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    await update.mutateAsync({
      alt: String(data.get('alt') || '').trim() || null,
      caption: String(data.get('caption') || '').trim() || null,
      tags,
    })
  }

  async function handleDelete() {
    await remove.mutateAsync()
    setConfirmDelete(false)
    onClose()
  }

  return (
    <>
      <Dialog open={Boolean(item)} onClose={onClose} title="Media details" className="max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="overflow-hidden rounded-md border border-border bg-muted">
            {item.isImage ? (
              <img src={item.publicUrl} alt={item.alt ?? item.originalName} className="max-h-[65vh] w-full object-contain" />
            ) : (
              <div className="flex aspect-video items-center justify-center text-muted-foreground">
                <MediaIcon item={item} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h3 className="break-words text-sm font-medium">{item.originalName}</h3>
              <div className="grid grid-cols-[6rem_1fr] gap-2 text-xs text-muted-foreground">
                <span>Size</span><span>{formatFileSize(item.size)}</span>
                <span>Type</span><span className="break-all">{item.mimeType}</span>
                <span>Uploaded</span><span>{formatDate(item.uploadedAt)}</span>
                <span>Dimensions</span><span>{formatDimensions(item)}</span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => copyMediaUrl(item.publicUrl)}>
                  <Copy />
                  Copy URL
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 />
                  Delete
                </Button>
              </div>
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="media-alt">Alt text</Label>
                <Input id="media-alt" name="alt" defaultValue={item.alt ?? ''} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="media-caption">Caption</Label>
                <Textarea id="media-caption" name="caption" defaultValue={item.caption ?? ''} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="media-tags">Tags</Label>
                <Input id="media-tags" name="tags" defaultValue={item.tags.join(', ')} placeholder="hero, product, docs" />
              </div>
              {update.isError ? (
                <Alert title="Could not update media" tone="danger">
                  {mutationErrorMessage(update.error, 'Update failed.')}
                </Alert>
              ) : null}
              {update.isSuccess ? <Alert title="Media updated">Metadata saved.</Alert> : null}
              <div className="flex justify-end">
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? <Spinner /> : <Pencil />}
                  Save metadata
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete media?"
        confirmLabel="Delete"
        pendingLabel="Deleting..."
        destructive
        pending={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      >
        {remove.isError ? (
          <Alert title="Could not delete media" tone="danger">
            {mutationErrorMessage(remove.error, 'Delete failed.')}
          </Alert>
        ) : (
          <>{item.originalName} will be removed from the media library.</>
        )}
      </ConfirmDialog>
    </>
  )
}

interface DeleteMediaDialogProps {
  item: MediaItem | null
  onClose: () => void
}

function DeleteMediaDialog({ item, onClose }: DeleteMediaDialogProps) {
  const remove = useDeleteMedia(item?.id ?? '')

  async function handleDelete() {
    if (!item) return
    await remove.mutateAsync()
    onClose()
  }

  return (
    <ConfirmDialog
      open={Boolean(item)}
      title="Delete media?"
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      destructive
      pending={remove.isPending}
      onCancel={onClose}
      onConfirm={handleDelete}
    >
      {remove.isError ? (
        <Alert title="Could not delete media" tone="danger">
          {mutationErrorMessage(remove.error, 'Delete failed.')}
        </Alert>
      ) : (
        <>{item?.originalName} will be removed from the media library.</>
      )}
    </ConfirmDialog>
  )
}

interface MediaTableProps {
  items: MediaItem[]
  selectedIds: string[]
  allPageSelected: boolean
  onToggleAll: (checked: boolean) => void
  onToggleItem: (id: string, checked: boolean) => void
  onOpen: (item: MediaItem) => void
  onDelete: (item: MediaItem) => void
}

function MediaTable({
  items,
  selectedIds,
  allPageSelected,
  onToggleAll,
  onToggleItem,
  onOpen,
  onDelete,
}: MediaTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox checked={allPageSelected} onCheckedChange={(checked) => onToggleAll(Boolean(checked))} aria-label="Select current page" />
          </TableHead>
          <TableHead className="w-20">Preview</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Dimensions</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <Checkbox
                checked={selectedIds.includes(item.id)}
                onCheckedChange={(checked) => onToggleItem(item.id, Boolean(checked))}
                aria-label={`Select ${item.originalName}`}
              />
            </TableCell>
            <TableCell>
              <MediaPreview item={item} onOpen={() => onOpen(item)} />
            </TableCell>
            <TableCell>
              <button
                type="button"
                className="max-w-80 truncate text-left font-medium hover:underline"
                title={item.originalName}
                onClick={() => onOpen(item)}
              >
                {item.originalName}
              </button>
              <div className="max-w-80 truncate font-mono text-xs text-muted-foreground">{item.filename}</div>
            </TableCell>
            <TableCell>
              <Badge>{mediaKind(item)}</Badge>
              <div className="mt-1 max-w-40 truncate text-xs text-muted-foreground">{item.mimeType}</div>
            </TableCell>
            <TableCell className="whitespace-nowrap">{formatFileSize(item.size)}</TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">{formatDimensions(item)}</TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(item.uploadedAt)}</TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="icon" aria-label={`Copy URL for ${item.originalName}`} onClick={() => copyMediaUrl(item.publicUrl)}>
                  <Copy />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${item.originalName}`} onClick={() => onDelete(item)}>
                  <Trash2 />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function MediaLibraryPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<'all' | MediaTypeFilter>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<MediaItem | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const bulkDelete = useBulkDeleteMedia()
  const limit = 24
  const { data, isLoading, isError } = useMediaList({
    page,
    limit,
    search,
    type: type === 'all' ? undefined : type,
  })

  const allPageSelected = data?.items.length ? data.items.every((item) => selectedIds.includes(item.id)) : false
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1

  function toggleSelection(id: string, checked: boolean) {
    setSelectedIds((current) => checked ? [...new Set([...current, id])] : current.filter((value) => value !== id))
  }

  function toggleAllPage(checked: boolean) {
    const pageIds = data?.items.map((item) => item.id) ?? []
    setSelectedIds((current) => checked ? [...new Set([...current, ...pageIds])] : current.filter((id) => !pageIds.includes(id)))
  }

  function updateType(next: 'all' | MediaTypeFilter) {
    setType(next)
    setPage(1)
    setSelectedIds([])
  }

  async function handleBulkDelete() {
    await bulkDelete.mutateAsync({ fileIds: selectedIds })
    setSelectedIds([])
    setBulkDeleteOpen(false)
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Media"
        description="Browse and manage uploaded media files."
        actions={(
          <Button type="button" onClick={() => setUploadOpen(true)}>
            <Upload />
            Upload
          </Button>
        )}
      />

      <FilterBar
        key={`${search}-${type}`}
        searchLabel="Search by filename, alt, or caption..."
        searchValue={search}
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(String(new FormData(event.currentTarget).get('q') || ''))
          setPage(1)
          setSelectedIds([])
        }}
      >
        <Select value={type} onValueChange={(value) => updateType(value as 'all' | MediaTypeFilter)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {mediaTypes.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FilterBar>

      {data ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{data.total} files</span>
          {data.types.map((entry) => <span key={entry.type}>{entry.type}: <strong className="text-foreground">{entry.count}</strong></span>)}
        </div>
      ) : null}

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
          <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
          <Button type="button" variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 />
            Delete selected
          </Button>
        </div>
      ) : null}

      {isLoading ? <LoadingState label="Loading media" /> : null}
      {isError ? <Alert title="Failed to load media" tone="danger">Could not fetch media. Try refreshing the page.</Alert> : null}

      {data && data.items.length === 0 && !isLoading ? (
        <div className="rounded-md border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No media files found.
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <MediaTable
            items={data.items}
            selectedIds={selectedIds}
            allPageSelected={allPageSelected}
            onToggleAll={toggleAllPage}
            onToggleItem={toggleSelection}
            onOpen={setDetailItem}
            onDelete={setDeleteItem}
          />

          <Pagination
            page={page}
            pageCount={totalPages}
            hrefForPage={(pageNumber) => `?page=${pageNumber}`}
            onPageChange={setPage}
            previousHref={page > 1 ? `?page=${page - 1}` : undefined}
            nextHref={page < totalPages ? `?page=${page + 1}` : undefined}
          />
        </>
      ) : null}

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <DetailDialog item={detailItem} onClose={() => setDetailItem(null)} />
      <DeleteMediaDialog item={deleteItem} onClose={() => setDeleteItem(null)} />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete selected media?"
        confirmLabel="Delete selected"
        pendingLabel="Deleting..."
        destructive
        pending={bulkDelete.isPending}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      >
        {bulkDelete.isError ? (
          <Alert title="Could not delete media" tone="danger">
            {mutationErrorMessage(bulkDelete.error, 'Delete failed.')}
          </Alert>
        ) : (
          <>{selectedIds.length} selected files will be removed from the media library.</>
        )}
      </ConfirmDialog>
    </section>
  )
}
