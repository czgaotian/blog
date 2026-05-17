import { useState } from 'react'
import { useApiReference } from '../api/routes'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { FilterBar } from '../components/ui/filter-bar'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

const methodColors: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  POST: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  PATCH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

function authLabel(auth: boolean | 'unknown'): string {
  if (auth === true) return 'Required'
  if (auth === false) return 'Public'
  return '?'
}

export function ApiReferencePage() {
  const { data, isLoading, isError } = useApiReference()
  const [search, setSearch] = useState('')

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setSearch((formData.get('q') as string) ?? '')
  }

  const endpoints = data?.endpoints ?? []
  const filtered = search
    ? endpoints.filter(
        ep =>
          ep.path.toLowerCase().includes(search.toLowerCase()) ||
          ep.description.toLowerCase().includes(search.toLowerCase()),
      )
    : endpoints

  const description =
    data ? `${filtered.length} endpoint${filtered.length !== 1 ? 's' : ''} · v${data.version}` : undefined

  return (
    <section className="space-y-6">
      <PageHeader title="API Reference" description={description} />

      <FilterBar searchLabel="Search endpoints" onSubmit={handleSearch} />

      {isLoading && <LoadingState label="Loading API reference" />}

      {isError && (
        <Alert title="Failed to load API reference" tone="danger">
          Could not fetch API reference. Try refreshing the page.
        </Alert>
      )}

      {!isLoading && !isError && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Auth</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell className="text-center text-muted-foreground" colSpan={5}>
                  No endpoints found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((ep, i) => (
                <TableRow key={`${ep.method}-${ep.path}-${i}`}>
                  <TableCell>
                    <Badge className={methodColors[ep.method] ?? 'bg-muted text-muted-foreground'}>
                      {ep.method}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs">{ep.path}</code>
                  </TableCell>
                  <TableCell className="text-sm">{ep.category}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{authLabel(ep.authentication)}</TableCell>
                  <TableCell className="text-sm">{ep.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
