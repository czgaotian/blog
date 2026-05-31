import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'

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
        <Button
          asChild
          aria-disabled={!previousHref}
          className={!previousHref ? 'pointer-events-none opacity-50' : undefined}
          variant="outline"
        >
          <a href={previousHref || '#'}>
            <ChevronLeft />
            Previous
          </a>
        </Button>
        <Button
          asChild
          aria-disabled={!nextHref}
          className={!nextHref ? 'pointer-events-none opacity-50' : undefined}
          variant="outline"
        >
          <a href={nextHref || '#'}>
            Next
            <ChevronRight />
          </a>
        </Button>
      </div>
    </nav>
  )
}
