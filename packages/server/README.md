# @worker-blog/server

Default Worker Blog server application package.

## Run

From the workspace root:

```bash
pnpm install
pnpm --filter @worker-blog/server db:migrate:local
pnpm dev
```

## Drizzle and D1

The Worker uses the `DB` D1 binding from `wrangler.toml` at runtime:

```ts
import { createDb } from './src/db';

const db = createDb(env.DB);
```

Drizzle Kit uses the Cloudflare D1 HTTP API for remote schema operations. Generated Drizzle migrations are written to the same `migrations` directory used by Wrangler. Put these values in the workspace root `.env` before running Drizzle Kit commands:

```ini
CLOUDFLARE_ACCOUNT_ID="..."
CLOUDFLARE_DATABASE_ID="..."
CLOUDFLARE_D1_TOKEN="..."
```

Useful commands from the workspace root:

```bash
pnpm --filter @worker-blog/server db:generate
pnpm --filter @worker-blog/server db:push
pnpm --filter @worker-blog/server db:studio
pnpm --filter @worker-blog/server db:migrate:http
```

Wrangler migrations are still available for local D1 and checked-in SQL migrations:

```bash
pnpm --filter @worker-blog/server db:migrate:local
pnpm --filter @worker-blog/server db:migrate
```

From this directory only:

```bash
pnpm dev
```
