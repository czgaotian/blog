import { useState } from 'react'
import { Link } from 'react-router'
import { useCollectionsList } from '../api/collections'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { FilterBar } from '../components/ui/filter-bar'

export function CollectionsListPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading, isError } = useCollectionsList({ search })

  return (
    <section className="space-y-6">
      <PageHeader
        title="Collections"
        description="Manage content type definitions and their fields."
        actions={
          <Link
            to="/admin/collections/new"
            className="inline-flex items-center justify-center gap-2 rounded-md font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-2 text-xs"
          >
            New collection
          </Link>
        }
      />

      <FilterBar
        searchLabel="Search by name…"
        onSubmit={(e) => {
          e.preventDefault()
          const q = new FormData(e.currentTarget).get('q') as string
          setSearch(q || '')
        }}
      />

      {isLoading && <LoadingState label="Loading collections" />}

      {isError && (
        <Alert title="Failed to load collections" tone="danger">
          Could not fetch collections. Try refreshing the page.
        </Alert>
      )}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Fields</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.collections.length === 0 ? (
              <TableRow>
                <TableCell className="text-center text-muted-foreground" colSpan={5}>
                  No collections found.
                </TableCell>
              </TableRow>
            ) : (
              data.collections.map(col => (
                <TableRow key={col.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium">{col.displayName}</p>
                      <p className="text-xs text-muted-foreground">{col.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{col.fieldCount}</TableCell>
                  <TableCell>
                    {col.isActive ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">active</Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground">inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(col.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      to={`/admin/collections/${col.id}/edit`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Edit
                    </Link>
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
