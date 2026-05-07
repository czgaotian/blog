# Worker Blog Monorepo

## Run

```bash
pnpm install
pnpm --filter @worker-blog/server db:migrate:local
pnpm dev
```

This starts `@worker-blog/server`. The runtime config is in [packages/server/wrangler.toml](/home/tian/Projects/sonicjs/packages/server/wrangler.toml).
