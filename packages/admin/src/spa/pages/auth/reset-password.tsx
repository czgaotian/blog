import { useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import { useRequestPasswordReset, useResetPassword } from '../../api/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Alert } from '../../components/ui/alert'
import { AdminApiError } from '../../api/client'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  return token ? <ResetForm token={token} /> : <RequestForm />
}

function RequestForm() {
  const [email, setEmail] = useState('')
  const request = useRequestPasswordReset()
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await request.mutateAsync({ email })
    setDone(true)
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="text-sm text-muted-foreground">Enter your email and we'll send a reset link</p>
      </div>

      {done ? (
        <Alert title="Email sent" tone="success">
          If an account exists for that email, a reset link has been sent.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {request.isError && (
            <Alert title="Failed" tone="danger">
              {request.error instanceof AdminApiError ? request.error.message : 'Unexpected error'}
            </Alert>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={request.isPending}>
            {request.isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}

      <div className="text-center text-sm">
        <Link to="/auth/login" className="text-muted-foreground hover:text-foreground underline underline-offset-4">
          Back to login
        </Link>
      </div>
    </div>
  )
}

function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const reset = useResetPassword()
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) return
    try {
      await reset.mutateAsync({ token, password, confirmPassword: confirm })
      setDone(true)
      setTimeout(() => { window.location.href = '/auth/login?message=Password+reset+successfully' }, 1500)
    } catch {
      // shown via reset.error
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
        <p className="text-sm text-muted-foreground">Choose a strong password for your account</p>
      </div>

      {done ? (
        <Alert title="Password reset" tone="success">Redirecting to login…</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {reset.isError && (
            <Alert title="Reset failed" tone="danger">
              {reset.error instanceof AdminApiError ? reset.error.message : 'Unexpected error'}
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
          <Button type="submit" className="w-full" disabled={reset.isPending || password !== confirm}>
            {reset.isPending ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
      )}
    </div>
  )
}
