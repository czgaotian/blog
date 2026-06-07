import type { MouseEvent } from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  pageCount: number
  previousHref?: string
  nextHref?: string
  hrefForPage?: (page: number) => string
  onPageChange?: (page: number) => void
}

type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end'

function getPaginationItems(page: number, pageCount: number): PaginationItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  const pages = new Set([1, pageCount, page - 1, page, page + 1])
  const visiblePages = Array.from(pages)
    .filter((item) => item >= 1 && item <= pageCount)
    .sort((a, b) => a - b)

  return visiblePages.flatMap<PaginationItem>((item, index) => {
    const previous = visiblePages[index - 1]
    if (!previous || item - previous === 1) return [item]
    return [item - previous === 2 ? previous + 1 : previous === 1 ? 'ellipsis-start' : 'ellipsis-end', item]
  })
}

function pageLabel(pageNumber: number, isCurrent: boolean) {
  return isCurrent ? `Page ${pageNumber}, current page` : `Go to page ${pageNumber}`
}

export function Pagination({
  page,
  pageCount,
  previousHref,
  nextHref,
  hrefForPage,
  onPageChange,
}: PaginationProps) {
  const safePageCount = Math.max(1, pageCount)
  const currentPage = Math.min(Math.max(1, page), safePageCount)
  const pages = getPaginationItems(currentPage, safePageCount)

  function handlePageClick(pageNumber: number) {
    if (pageNumber === currentPage) return
    onPageChange?.(pageNumber)
  }

  function handleLinkClick(event: MouseEvent<HTMLAnchorElement>, pageNumber: number) {
    if (!onPageChange) return
    event.preventDefault()
    handlePageClick(pageNumber)
  }

  function renderPageLink(pageNumber: number) {
    const isCurrent = pageNumber === currentPage
    const href = hrefForPage?.(pageNumber) ?? '#'

    return (
      <li key={pageNumber}>
        <Button
          asChild
          variant={isCurrent ? 'outline' : 'ghost'}
          size="icon"
          aria-current={isCurrent ? 'page' : undefined}
          className={cn(isCurrent && 'pointer-events-none bg-accent text-accent-foreground')}
        >
          <a href={href} aria-label={pageLabel(pageNumber, isCurrent)} onClick={(event) => handleLinkClick(event, pageNumber)}>
            {pageNumber}
          </a>
        </Button>
      </li>
    )
  }

  function renderControl(direction: 'previous' | 'next') {
    const isPrevious = direction === 'previous'
    const targetPage = isPrevious ? currentPage - 1 : currentPage + 1
    const href = isPrevious ? previousHref : nextHref
    const disabled = targetPage < 1 || targetPage > safePageCount || (!href && !onPageChange)

    return (
      <Button
        asChild
        aria-disabled={disabled}
        className={cn(disabled && 'pointer-events-none opacity-50')}
        variant="ghost"
      >
        <a
          href={href ?? '#'}
          aria-label={isPrevious ? 'Go to previous page' : 'Go to next page'}
          onClick={(event) => {
            if (disabled) return
            handleLinkClick(event, targetPage)
          }}
        >
          {isPrevious ? <ChevronLeft data-icon="inline-start" /> : null}
          <span className="hidden sm:inline">{isPrevious ? 'Previous' : 'Next'}</span>
          {isPrevious ? null : <ChevronRight data-icon="inline-end" />}
        </a>
      </Button>
    )
  }

  return (
    <nav className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row" aria-label="Pagination">
      <p className="text-muted-foreground" aria-live="polite">
        Page {currentPage} of {safePageCount}
      </p>
      <ul className="flex items-center gap-1">
        <li>{renderControl('previous')}</li>
        {pages.map((item) => (
          typeof item === 'number' ? renderPageLink(item) : (
            <li key={item} className="flex size-9 items-center justify-center text-muted-foreground">
              <MoreHorizontal aria-hidden="true" />
              <span className="sr-only">More pages</span>
            </li>
          )
        ))}
        <li>{renderControl('next')}</li>
      </ul>
    </nav>
  )
}
