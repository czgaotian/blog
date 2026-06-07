import { useMemo, useState, type FormEvent } from 'react'
import type { MediaItem, MediaTypeFilter, UploadMediaResponse } from '@worker-blog/shared/admin-api'
import {
  CheckSquare,
  Copy,
  FileText,
  FolderInput,
  ImageIcon,
  Pencil,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react'
import {
  useBulkDeleteMedia,
  useBulkMoveMedia,
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
import { Textarea } from '../components/ui/textarea'

const mediaTypes: Array<{ value: 'all' | MediaTypeFilter; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'images', label: 'Images' },
  { value: 'videos', label: 'Videos' },
  { value: 'documents', label: 'Documents' },
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

function mutationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AdminApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function folderOptions(items: string[]) {
  return ['all', ...items]
}

function MediaIcon({ item }: { item: MediaItem }) {
  if (item.isVideo) return <Video />
  if (item.isImage) return <ImageIcon />
  return <FileText />
}

interface MediaCardProps {
  item: MediaItem
  selected: boolean
  selectionMode: boolean
  onSelect: (checked: boolean) => void
  onOpen: () => void
}

function MediaCard({ item, selected, selectionMode, onSelect, onOpen }: MediaCardProps) {
  return (
    <article className="group overflow-hidden rounded-md border border-border bg-card">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {selectionMode ? (
          <label className="absolute left-2 top-2 z-10 rounded-md bg-background/90 p-1 shadow-sm">
            <span className="sr-only">Select {item.originalName}</span>
            <Checkbox checked={selected} onCheckedChange={(checked) => onSelect(Boolean(checked))} />
          </label>
        ) : null}
        <button
          type="button"
          className="flex size-full items-center justify-center text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onOpen}
        >
          {item.isImage ? (
            <img
              src={item.thumbnailUrl ?? item.publicUrl}
              alt={item.alt ?? item.originalName}
              className="size-full object-cover"
            />
          ) : (
            <span className="flex flex-col items-center gap-2 px-3 text-center">
              <MediaIcon item={item} />
              <span className="max-w-full truncate text-xs">{item.mimeType}</span>
            </span>
          )}
        </button>
      </div>
      <div className="flex flex-col gap-1 p-3">
        <button type="button" className="truncate text-left text-sm font-medium hover:underline" title={item.originalName} onClick={onOpen}>
          {item.originalName}
        </button>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(item.size)}</span>
          <Badge>{item.folder}</Badge>
        </div>
      </div>
    </article>
  )
}

interface UploadDialogProps {
  open: boolean
  folders: string[]
  onClose: () => void
}

function UploadDialog({ open, folders, onClose }: UploadDialogProps) {
  const upload = useUploadMedia()
  const [result, setResult] = useState<UploadMediaResponse | null>(null)
  const [folder, setFolder] = useState('uploads')
  const [customFolder, setCustomFolder] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const targetFolder = customFolder.trim() || folder
    data.set('folder', targetFolder)
    const response = await upload.mutateAsync(data)
    setResult(response)
    if (response.success) form.reset()
  }

  function close() {
    upload.reset()
    setResult(null)
    setCustomFolder('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={close} title="Upload media" className="max-w-2xl">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="media-files">Files</Label>
          <Input id="media-files" name="files" type="file" multiple required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="upload-folder">Folder</Label>
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger id="upload-folder" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {[...new Set(['uploads', ...folders])].map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="custom-upload-folder">New folder</Label>
            <Input id="custom-upload-folder" value={customFolder} onChange={(event) => setCustomFolder(event.target.value)} placeholder="optional-folder" />
          </div>
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

interface MoveDialogProps {
  open: boolean
  folders: string[]
  selectedIds: string[]
  onClose: () => void
  onMoved: () => void
}

function MoveDialog({ open, folders, selectedIds, onClose, onMoved }: MoveDialogProps) {
  const move = useBulkMoveMedia()
  const [folder, setFolder] = useState(folders[0] || 'uploads')
  const [customFolder, setCustomFolder] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await move.mutateAsync({ fileIds: selectedIds, folder: customFolder.trim() || folder })
    onMoved()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Move media">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <p className="text-sm text-muted-foreground">{selectedIds.length} selected files will move to the target folder.</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="move-folder">Folder</Label>
          <Select value={folder} onValueChange={setFolder}>
            <SelectTrigger id="move-folder" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {[...new Set(['uploads', ...folders])].map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="custom-move-folder">New folder</Label>
          <Input id="custom-move-folder" value={customFolder} onChange={(event) => setCustomFolder(event.target.value)} placeholder="optional-folder" />
        </div>
        {move.isError ? (
          <Alert title="Move failed" tone="danger">
            {mutationErrorMessage(move.error, 'Could not move media.')}
          </Alert>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={move.isPending} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={move.isPending || selectedIds.length === 0}>
            {move.isPending ? <Spinner /> : <FolderInput />}
            Move
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
                <span>Folder</span><span>{item.folder}</span>
                <span>Uploaded</span><span>{formatDate(item.uploadedAt)}</span>
                {item.width && item.height ? <><span>Dimensions</span><span>{item.width} x {item.height}</span></> : null}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(item.publicUrl)}>
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
          <>“{item.originalName}” will be removed from the media library.</>
        )}
      </ConfirmDialog>
    </>
  )
}

export function MediaLibraryPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<'all' | MediaTypeFilter>('all')
  const [folder, setFolder] = useState('all')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const bulkDelete = useBulkDeleteMedia()
  const limit = 24
  const { data, isLoading, isError } = useMediaList({
    page,
    limit,
    search,
    type: type === 'all' ? undefined : type,
    folder: folder === 'all' ? '' : folder,
  })

  const folders = useMemo(() => data?.folders.map((entry) => entry.folder) ?? [], [data])
  const selectedOnPage = data?.items.filter((item) => selectedIds.includes(item.id)) ?? []
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

  function updateFolder(next: string) {
    setFolder(next)
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
          <div className="flex gap-2">
            <Button type="button" variant={selectionMode ? 'secondary' : 'outline'} onClick={() => setSelectionMode((value) => !value)}>
              {selectionMode ? <X /> : <CheckSquare />}
              {selectionMode ? 'Exit selection' : 'Select'}
            </Button>
            <Button type="button" onClick={() => setUploadOpen(true)}>
              <Upload />
              Upload
            </Button>
          </div>
        )}
      />

      <FilterBar
        key={`${search}-${type}-${folder}`}
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
        <Select value={folder} onValueChange={updateFolder}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {folderOptions(folders).map((name) => (
                <SelectItem key={name} value={name}>{name === 'all' ? 'All folders' : name}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FilterBar>

      {data ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{data.total} files</span>
          {data.types.map((entry) => <span key={entry.type}>{entry.type}: <strong className="text-foreground">{entry.count}</strong></span>)}
          {data.folders.length ? <span>{data.folders.length} folders</span> : null}
        </div>
      ) : null}

      {selectionMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={allPageSelected} onCheckedChange={(checked) => toggleAllPage(Boolean(checked))} />
            Select current page
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
            <Button type="button" variant="outline" size="sm" disabled={selectedIds.length === 0} onClick={() => setMoveOpen(true)}>
              <FolderInput />
              Move
            </Button>
            <Button type="button" variant="destructive" size="sm" disabled={selectedIds.length === 0} onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 />
              Delete
            </Button>
          </div>
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {data.items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                selected={selectedIds.includes(item.id)}
                selectionMode={selectionMode}
                onSelect={(checked) => toggleSelection(item.id, checked)}
                onOpen={() => setDetailItem(item)}
              />
            ))}
          </div>

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

      <UploadDialog open={uploadOpen} folders={folders} onClose={() => setUploadOpen(false)} />
      <MoveDialog
        open={moveOpen}
        folders={folders}
        selectedIds={selectedIds}
        onClose={() => setMoveOpen(false)}
        onMoved={() => setSelectedIds([])}
      />
      <DetailDialog item={detailItem} onClose={() => setDetailItem(null)} />
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
          <>{selectedOnPage.length || selectedIds.length} selected files will be removed from the media library.</>
        )}
      </ConfirmDialog>
    </section>
  )
}
