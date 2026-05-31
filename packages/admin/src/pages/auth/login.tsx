import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginRequest } from '@worker-blog/shared/admin-api'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { useLogin } from '../../api/auth'
import { Button } from '../../components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { Spinner } from '../../components/ui/spinner'
import { Alert } from '../../components/ui/alert'
import { AdminApiError } from '../../api/client'

export function LoginPage() {
  const login = useLogin()
  const [searchParams] = useSearchParams()
  const message = searchParams.get('message')
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function handleSubmit(values: LoginRequest) {
    try {
      await login.mutateAsync(values)
      window.location.href = '/dashboard'
    } catch {
      // error shown via login.error below
    }
  }

  const { errors } = form.formState

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your account</p>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <FieldGroup>
          {message && (
            <Alert title={message} tone="success" />
          )}
          {login.isError && (
            <Alert title="Sign in failed" tone="danger">
              {login.error instanceof AdminApiError ? login.error.message : 'Unexpected error'}
            </Alert>
          )}

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...form.register('email')}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...form.register('password')}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? (
            <>
              <Spinner />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
        </FieldGroup>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/auth/register" className="hover:text-foreground underline underline-offset-4">
          Register
        </Link>
      </div>
    </div>
  )
}
