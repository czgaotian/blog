import { useState } from 'react'
import { Link } from 'react-router'
import { useLogsList } from '../api/logs'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { FilterBar } from '../components/ui/filter-bar'
import { LoadingState } from '../components/ui/loading-state'
import { Pagination } from '../components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

const levelColors: Record<string, string> = {
  debug: 'bg-muted text-muted-foreground',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  warn: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  fatal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
}

export function LogsListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading, isError } = useLogsList({ page, search: search || undefined })

  const totalPages = data?.pagination.totalPages ?? 1

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setSearch(formData.get('q') as string)
    setPage(1)
  }

  function buildPageHref(p: number) {
    const params = new URLSearchParams()
    params.set('page', String(p))
    if (search) params.set('q', search)
    return `?${params.toString()}`
  }

  return (
    <section className="space-y-6">
      <PageHeader title="Logs" description="Application logs and activity." />

      <FilterBar searchLabel="Search logs" onSubmit={handleSearch} />

      {isLoading && <LoadingState label="Loading logs" />}

      {isError && (
        <Alert title="Failed to load logs" tone="danger">
          Could not fetch logs. Try refreshing the page.
        </Alert>
      )}

      {!isLoading && !isError && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.logs.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground" colSpan={5}>
                    No logs found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge className={levelColors[log.level] ?? 'bg-muted text-muted-foreground'}>
                        {log.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-muted text-muted-foreground">{log.category}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      <Link className="hover:underline" to={`/logs/${log.id}`}>
                        {log.message}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.source ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <Pagination
              page={page}
              pageCount={totalPages}
              previousHref={page > 1 ? buildPageHref(page - 1) : undefined}
              nextHref={page < totalPages ? buildPageHref(page + 1) : undefined}
            />
          )}
        </>
      )}
    </section>
  )
}
