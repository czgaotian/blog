import { useState } from 'react'
import { useUsersList } from '../api/users'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Pagination } from '../components/ui/pagination'
import { FilterBar } from '../components/ui/filter-bar'
import { Link } from 'react-router'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  author: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  viewer: 'bg-muted text-muted-foreground',
}

export function UsersListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading, isError } = useUsersList({ page, limit: 20, search })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 20)) : 1

  return (
    <section className="space-y-6">
      <PageHeader title="Users" description="Manage user accounts and roles." />

      <FilterBar
        searchLabel="Search by email or name…"
        onSubmit={(e) => {
          e.preventDefault()
          const q = new FormData(e.currentTarget).get('q') as string
          setSearch(q || '')
          setPage(1)
        }}
      />

      {isLoading && <LoadingState label="Loading users" />}

      {isError && (
        <Alert title="Failed to load users" tone="danger">
          Could not fetch users. Try refreshing the page.
        </Alert>
      )}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground" colSpan={5}>
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                data.users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link
                        to={`/admin/users/${user.id}/edit`}
                        className="font-medium hover:underline"
                      >
                        {user.email}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[user.role] || 'bg-muted text-muted-foreground'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            pageCount={totalPages}
            previousHref={page > 1 ? `?page=${page - 1}&q=${encodeURIComponent(search)}` : undefined}
            nextHref={page < totalPages ? `?page=${page + 1}&q=${encodeURIComponent(search)}` : undefined}
          />
        </>
      )}
    </section>
  )
}
