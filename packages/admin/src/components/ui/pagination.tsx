import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ButtonLink } from './button'

interface PaginationProps {
  page: number
  pageCount: number
  previousHref?: string
  nextHref?: string
}

export function Pagination({ page, pageCount, previousHref, nextHref }: PaginationProps) {
  return (
    <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Pagination">
      <p className="text-muted-foreground">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-2">
        <ButtonLink
          aria-disabled={!previousHref}
          className={!previousHref ? 'pointer-events-none opacity-50' : undefined}
          href={previousHref || '#'}
          variant="outline"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </ButtonLink>
        <ButtonLink
          aria-disabled={!nextHref}
          className={!nextHref ? 'pointer-events-none opacity-50' : undefined}
          href={nextHref || '#'}
          variant="outline"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </ButtonLink>
      </div>
    </nav>
  )
}
