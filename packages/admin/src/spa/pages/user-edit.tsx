import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useUserDetail, useUpdateUser, useDeleteUser } from '../api/users'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { LoadingState } from '../components/ui/loading-state'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { AdminApiError } from '../api/client'

const ROLES = ['admin', 'editor', 'author', 'viewer'] as const

export function UserEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useUserDetail(id!)
  const updateMutation = useUpdateUser(id!)
  const deleteMutation = useDeleteUser(id!)

  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [role, setRole] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  useEffect(() => {
    if (data?.user) {
      setRole(data.user.role)
      setFirstName(data.user.firstName ?? '')
      setLastName(data.user.lastName ?? '')
    }
  }, [data])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    await updateMutation.mutateAsync({ role: role as any, firstName, lastName })
    setSaved(true)
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync()
    navigate('/admin/users')
  }

  if (isLoading) return <LoadingState label="Loading user" />
  if (isError) return <Alert title="Failed to load user" tone="danger">Try refreshing the page.</Alert>
  if (!data) return null

  const user = data.user

  return (
    <section className="space-y-6">
      <PageHeader
        title={`Edit user: ${user.email}`}
        description="Update role and profile information."
      />

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        {updateMutation.isError && (
          <Alert title="Save failed" tone="danger">
            {updateMutation.error instanceof AdminApiError
              ? updateMutation.error.message
              : 'Unexpected error'}
          </Alert>
        )}
        {saved && !updateMutation.isError && (
          <Alert title="Saved" tone="success">User updated.</Alert>
        )}

        <div className="grid gap-1.5">
          <Label>Email</Label>
          <Input value={user.email} disabled />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            value={role}
            onChange={e => setRole(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {ROLES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/users')}
          >
            Cancel
          </Button>
        </div>
      </form>

      <div className="border-t border-border pt-6">
        <p className="mb-3 text-sm font-medium text-destructive">Danger zone</p>
        {!confirmDelete ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            Delete user
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">This cannot be undone.</p>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Confirm delete'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
          </div>
        )}
        {deleteMutation.isError && (
          <Alert title="Delete failed" tone="danger" className="mt-3">
            {deleteMutation.error instanceof AdminApiError
              ? deleteMutation.error.message
              : 'Unexpected error'}
          </Alert>
        )}
      </div>
    </section>
  )
}
