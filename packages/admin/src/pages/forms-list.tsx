import { useState } from 'react'
import { useFormsList } from '../api/forms'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { FilterBar } from '../components/ui/filter-bar'

export function FormsListPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading, isError } = useFormsList({ search })

  return (
    <section className="space-y-6">
      <PageHeader title="Forms" description="Manage forms and their submissions." />

      <FilterBar
        searchLabel="Search by name…"
        onSubmit={(e) => {
          e.preventDefault()
          const q = new FormData(e.currentTarget).get('q') as string
          setSearch(q || '')
        }}
      />

      {isLoading && <LoadingState label="Loading forms" />}

      {isError && (
        <Alert title="Failed to load forms" tone="danger">
          Could not fetch forms. Try refreshing the page.
        </Alert>
      )}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.forms.length === 0 ? (
              <TableRow>
                <TableCell className="text-center text-muted-foreground" colSpan={5}>
                  No forms found.
                </TableCell>
              </TableRow>
            ) : (
              data.forms.map(form => (
                <TableRow key={form.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium">{form.displayName}</p>
                      <p className="text-xs text-muted-foreground">{form.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-muted text-muted-foreground">{form.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={form.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-muted text-muted-foreground'}>
                      {form.isActive ? 'active' : 'inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{form.submissionCount}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(form.updatedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
