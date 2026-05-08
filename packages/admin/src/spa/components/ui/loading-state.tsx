import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface LoadingStateProps {
  label?: string
  className?: string
}

export function LoadingState({ label = 'Loading', className }: LoadingStateProps) {
  return (
    <div className={cn('flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground', className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  )
}
