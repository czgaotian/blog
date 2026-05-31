# Register Schema And Form

## Background

The first-admin registration flow uses the `users` table as the source of truth. The database requires `email`, `username`, `first_name`, and `last_name`, and the server also needs a plain `password` so it can create `password_hash`.

The canonical request contract is `registerSchema` from `@worker-blog/shared/admin-api`. Frontend and backend code should import that schema instead of creating local register validation rules.

## Field Contract

`registerSchema` validates and normalizes these fields:

| Field | Rules | Error message policy |
| --- | --- | --- |
| `email` | Required string, trimmed, valid email, lowercased | English field-level messages |
| `username` | Required string, trimmed, 3-100 chars, letters/numbers/underscore/hyphen only | English field-level messages |
| `firstName` | Required string, trimmed, max 100 chars | English field-level messages |
| `lastName` | Required string, trimmed, max 100 chars | English field-level messages |
| `password` | Required string, 8-128 chars | English field-level messages |

Registration no longer derives `username` from `email`. The caller must submit `username`, `firstName`, and `lastName`.

## Data Flow

1. `packages/admin/src/pages/auth/register.tsx` uses React Hook Form with `zodResolver(registerSchema)`.
2. Valid form data is sent through `useRegister()` to `POST /api/auth/register`.
3. `packages/server/src/routes/auth.ts` parses the same shared `registerSchema`.
4. The server lowercases the already-normalized email defensively, hashes `password`, and inserts `email`, `username`, `first_name`, `last_name`, `password_hash`, and first-admin metadata into `users`.
5. Existing first-admin behavior remains: registration is allowed only while the `users` table is empty.

## shadcn And Form UI Notes

The admin package uses official shadcn component APIs for the migrated controls:

- `Button`, `Input`, `Label`, `Field`, `InputGroup`, and `Spinner` come from shadcn CLI output.
- Links that look like buttons should use `Button asChild` with an `<a>` or router `Link`; do not reintroduce `ButtonLink`.
- Register fields should use `Field`, `FieldLabel`, and `FieldError`.
- Put `data-invalid` on `Field` and `aria-invalid` on the form control.
- Pending buttons should compose `Spinner` inside `Button`; do not add custom `isPending` props.

## Agent Notes

- Do not add another register schema in the admin or server packages.
- If registration fields change, update all of these together: `registerSchema`, register page fields, server insert mapping, server tests, and shared schema tests.
- Database migrations are not needed for the current change because the existing `users` table already requires the profile fields.
- Keep schema error messages in English unless the whole admin UI localization strategy changes.

## Verification

Relevant checks for this flow:

- `pnpm --filter @worker-blog/shared test`
- `pnpm --filter @worker-blog/server test`
- `pnpm --filter @worker-blog/admin build`
- `pnpm type-check`

Current coverage includes shared schema success/failure cases, server registration success, invalid registration payloads, existing-user rejection, and admin type-check/build coverage for the React Hook Form + shadcn migration.
