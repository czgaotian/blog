import type { HTMLAttributes, ReactNode } from 'react'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import { cn } from '../../lib/utils'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  children?: ReactNode
  tone?: 'info' | 'danger' | 'success'
}

export function Alert({ title, children, className, tone = 'info', ...props }: AlertProps) {
  const Icon = tone === 'danger' ? AlertCircle : tone === 'success' ? CheckCircle : Info

  return (
    <div
      data-slot="alert"
      className={cn(
        'flex gap-3 rounded-md border border-border bg-card p-3 text-card-foreground',
        tone === 'danger' && 'border-destructive/30 text-destructive',
        tone === 'success' && 'border-green-500/30 text-green-700 dark:text-green-400',
        className,
      )}
      role={tone === 'danger' ? 'alert' : 'status'}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {children ? <div className="text-sm text-muted-foreground">{children}</div> : null}
      </div>
    </div>
  )
}
