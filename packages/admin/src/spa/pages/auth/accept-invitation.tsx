import { useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import { useAcceptInvitation } from '../../api/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Alert } from '../../components/ui/alert'
import { AdminApiError } from '../../api/client'

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const accept = useAcceptInvitation()
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <Alert title="Invalid invitation" tone="danger">
          This invitation link is invalid or has expired.
        </Alert>
        <Link to="/admin/auth/login" className="text-sm underline underline-offset-4">
          Go to login
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) return
    try {
      await accept.mutateAsync({ token, password })
      setDone(true)
      setTimeout(() => { window.location.href = '/admin/dashboard' }, 1500)
    } catch {
      // shown via accept.error
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Accept invitation</h1>
        <p className="text-sm text-muted-foreground">Set a password to activate your account</p>
      </div>

      {done ? (
        <Alert title="Account activated" tone="success">Redirecting to dashboard…</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {accept.isError && (
            <Alert title="Failed" tone="danger">
              {accept.error instanceof AdminApiError ? accept.error.message : 'Unexpected error'}
            </Alert>
          )}
          {password !== confirm && confirm.length > 0 && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>

          <Button type="submit" className="w-full" disabled={accept.isPending || password !== confirm}>
            {accept.isPending ? 'Activating…' : 'Activate account'}
          </Button>
        </form>
      )}
    </div>
  )
}
