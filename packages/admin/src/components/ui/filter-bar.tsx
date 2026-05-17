import type { FormHTMLAttributes, ReactNode } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../../lib/utils'

interface FilterBarProps extends FormHTMLAttributes<HTMLFormElement> {
  searchLabel?: string
  actions?: ReactNode
}

export function FilterBar({ searchLabel = 'Search', actions, children, className, ...props }: FilterBarProps) {
  return (
    <form
      className={cn('flex flex-col gap-3 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center', className)}
      {...props}
    >
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{searchLabel}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          name="q"
          placeholder={searchLabel}
          type="search"
        />
      </label>
      {children}
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </form>
  )
}
