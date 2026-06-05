import { useState } from 'react'
import { ImageIcon, X } from 'lucide-react'
import { useMediaDetail, useMediaList } from '../../api/media'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { LoadingState } from '../ui/loading-state'

interface CoverImagePickerProps {
  value: string
  onChange: (value: string) => void
}

export function CoverImagePicker({ value, onChange }: CoverImagePickerProps) {
  const [open, setOpen] = useState(false)
  const media = useMediaList({ limit: 48, type: 'images' })
  const selected = useMediaDetail(value)

  return (
    <>
      <div className="flex flex-col gap-3">
        {value ? (
          <div className="overflow-hidden rounded-md border border-border bg-muted">
            {selected.data?.item.isImage ? (
              <img
                className="aspect-video w-full object-cover"
                src={selected.data.item.thumbnailUrl ?? selected.data.item.publicUrl}
                alt={selected.data.item.alt ?? selected.data.item.originalName}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
                Selected media: {value}
              </div>
            )}
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
            <ImageIcon className="mr-2" />
            No cover image
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            <ImageIcon />
            {value ? 'Change cover' : 'Choose cover'}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" onClick={() => onChange('')}>
              <X />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Choose cover image" className="max-w-4xl">
        {media.isLoading ? <LoadingState label="Loading images" /> : null}
        {media.isError ? <p className="text-sm text-destructive">Could not load images.</p> : null}
        {media.data?.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No images found.</p>
        ) : null}
        {media.data?.items.length ? (
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
            {media.data.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="overflow-hidden rounded-md border border-border text-left outline-none hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  onChange(item.id)
                  setOpen(false)
                }}
              >
                <img
                  className="aspect-square w-full object-cover"
                  src={item.thumbnailUrl ?? item.publicUrl}
                  alt={item.alt ?? item.originalName}
                />
                <p className="truncate p-2 text-xs">{item.originalName}</p>
              </button>
            ))}
          </div>
        ) : null}
      </Dialog>
    </>
  )
}
