import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterRequest } from '@worker-blog/shared/admin-api'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { useRegister } from '../../api/auth'
import { Button } from '../../components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { Spinner } from '../../components/ui/spinner'
import { Alert } from '../../components/ui/alert'
import { AdminApiError } from '../../api/client'

export function RegisterPage() {
  const registerMutation = useRegister()
  const [done, setDone] = useState(false)
  const form = useForm<RegisterRequest>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      firstName: '',
      lastName: '',
      password: '',
    },
  })

  async function handleSubmit(values: RegisterRequest) {
    try {
      await registerMutation.mutateAsync(values)
      setDone(true)
      setTimeout(() => { window.location.href = '/dashboard' }, 1500)
    } catch {
      // shown via registerMutation.error
    }
  }

  const { errors } = form.formState

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm text-muted-foreground">Get started with Worker Blog</p>
      </div>

      {done ? (
        <Alert title="Account created" tone="success">Redirecting to dashboard…</Alert>
      ) : (
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup>
            {registerMutation.isError && (
              <Alert title="Registration failed" tone="danger">
                {registerMutation.error instanceof AdminApiError ? registerMutation.error.message : 'Unexpected error'}
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.firstName}>
                <FieldLabel htmlFor="firstName">First name</FieldLabel>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  aria-invalid={!!errors.firstName}
                  {...form.register('firstName')}
                />
                <FieldError errors={[errors.firstName]} />
              </Field>
              <Field data-invalid={!!errors.lastName}>
                <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  aria-invalid={!!errors.lastName}
                  {...form.register('lastName')}
                />
                <FieldError errors={[errors.lastName]} />
              </Field>
            </div>

            <Field data-invalid={!!errors.username}>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                id="username"
                autoComplete="username"
                aria-invalid={!!errors.username}
                {...form.register('username')}
              />
              <FieldError errors={[errors.username]} />
            </Field>

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
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...form.register('password')}
              />
              <FieldError errors={[errors.password]} />
            </Field>

            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? (
                <>
                  <Spinner />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </FieldGroup>
        </form>
      )}

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/auth/login" className="hover:text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </div>
  )
}
