import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerSchema,
  type RegisterRequest,
} from "@worker-blog/shared/admin-api";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";
import { useRegister } from "../../api/auth";
import { Button } from "../../components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../../components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "../../components/ui/input-group";
import { Spinner } from "../../components/ui/spinner";
import { Alert } from "../../components/ui/alert";
import { AdminApiError } from "../../api/client";

const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z
      .string({ error: "Confirm your password" })
      .min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function RegisterPage() {
  const registerMutation = useRegister();
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      username: "",
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function handleSubmit(values: RegisterFormValues) {
    const registerValues: RegisterRequest = {
      email: values.email,
      username: values.username,
      firstName: values.firstName,
      lastName: values.lastName,
      password: values.password,
    };

    try {
      await registerMutation.mutateAsync(registerValues);
      setDone(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch {
      // shown via registerMutation.error
    }
  }

  const { errors } = form.formState;
  const passwordInputType = showPassword ? "text" : "password";
  const PasswordIcon = showPassword ? EyeOff : Eye;
  const confirmPasswordInputType = showConfirmPassword ? "text" : "password";
  const ConfirmPasswordIcon = showConfirmPassword ? EyeOff : Eye;

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create account
        </h1>
        <p className="text-sm text-muted-foreground">
          Get started with Worker Blog
        </p>
      </div>

      {done ? (
        <Alert title="Account created" tone="success">
          Redirecting to dashboard…
        </Alert>
      ) : (
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup>
            {registerMutation.isError && (
              <Alert title="Registration failed" tone="danger">
                {registerMutation.error instanceof AdminApiError
                  ? registerMutation.error.message
                  : "Unexpected error"}
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.firstName}>
                <FieldLabel htmlFor="firstName">First name</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="firstName"
                    autoComplete="given-name"
                    aria-invalid={!!errors.firstName}
                    {...form.register("firstName")}
                  />
                </InputGroup>
                <FieldError errors={[errors.firstName]} />
              </Field>
              <Field data-invalid={!!errors.lastName}>
                <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="lastName"
                    autoComplete="family-name"
                    aria-invalid={!!errors.lastName}
                    {...form.register("lastName")}
                  />
                </InputGroup>
                <FieldError errors={[errors.lastName]} />
              </Field>
            </div>

            <Field data-invalid={!!errors.username}>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="username"
                  autoComplete="username"
                  aria-invalid={!!errors.username}
                  {...form.register("username")}
                />
              </InputGroup>
              <FieldError errors={[errors.username]} />
            </Field>

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...form.register("email")}
                />
              </InputGroup>
              <FieldError errors={[errors.email]} />
            </Field>

            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="password"
                  type={passwordInputType}
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...form.register("password")}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={
                      showPassword ? "Hide passwords" : "Show passwords"
                    }
                    size="icon-xs"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    <PasswordIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldError errors={[errors.password]} />
            </Field>

            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="confirmPassword">
                Confirm password
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="confirmPassword"
                  type={confirmPasswordInputType}
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  {...form.register("confirmPassword")}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={
                      showConfirmPassword ? "Hide passwords" : "Show passwords"
                    }
                    size="icon-xs"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                  >
                    <ConfirmPasswordIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldError errors={[errors.confirmPassword]} />
            </Field>

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <Spinner />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </FieldGroup>
        </form>
      )}

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/auth/login"
          className="hover:text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
