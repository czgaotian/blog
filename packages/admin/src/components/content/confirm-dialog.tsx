import type { ReactNode } from 'react'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Spinner } from '../ui/spinner'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  pendingLabel: string
  destructive?: boolean
  pending?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  pendingLabel,
  destructive,
  pending,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <div className="flex flex-col gap-5">
        <div className="text-sm text-muted-foreground">{children}</div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? <Spinner /> : null}
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
