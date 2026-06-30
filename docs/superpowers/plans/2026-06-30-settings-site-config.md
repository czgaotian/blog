# Settings Site Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add site-level settings in admin `/settings` and make `www` consume them for public branding, default SEO metadata, favicon, and maintenance mode.

**Architecture:** Extend the existing JSON-backed settings table with two new `general` keys, `siteUrl` and `faviconUrl`; no migration is needed. Keep admin contracts in `packages/shared`, settings persistence in `packages/server`, and expose a small public-safe settings endpoint for `www`.

**Tech Stack:** TypeScript, Zod, Hono, Cloudflare D1, React admin, SvelteKit `www`, Vitest.

## Global Constraints

- Do not add a separate SEO tab in the first version.
- Do not add article-level SEO controls.
- Do not add sitemap management, robots management, search verification, favicon upload, or image processing.
- Do not change migration files.
- Keep `/settings/security` unchanged: only `jwtExpiresIn` and `jwtRefreshGraceSeconds`.
- Do not expose `adminEmail` through the public settings endpoint.
- Put shared request/response contracts in `packages/shared`.

---

## File Structure

- Modify `packages/shared/src/admin-api/settings.ts`: add `siteUrl` and `faviconUrl` to admin general settings and validation.
- Create `packages/shared/src/public-api/settings.ts`: public-safe settings response contract.
- Modify `packages/shared/src/public-api/index.ts`: export public settings contract.
- Create `packages/shared/src/admin-api/settings.test.ts`: focused schema tests for new URL validation.
- Modify `packages/server/src/services/settings.ts`: add defaults, persistence, and public-safe mapping.
- Modify `packages/server/src/services/settings.test.ts`: cover new defaults, save behavior, and public-safe mapping.
- Modify `packages/server/src/routes/admin-api-settings.test.ts`: cover admin GET/PUT returning and saving new fields.
- Modify `packages/server/src/routes/api.ts`: add public `GET /api/settings`.
- Create `packages/server/src/routes/api-settings.test.ts`: cover public endpoint and `adminEmail` exclusion.
- Modify `packages/admin/src/pages/settings.tsx`: add `siteUrl` and `faviconUrl` inputs to General.
- Modify `packages/www/src/lib/server/api.ts`: add public settings fetch with fallback helper.
- Create `packages/www/src/lib/server/api.test.ts`: cover settings fallback behavior.
- Create `packages/www/src/routes/+layout.server.ts`: load public settings for the root layout.
- Modify `packages/www/src/routes/+layout.svelte`: consume settings in metadata, header, favicon, and maintenance mode.

---

### Task 1: Shared Contracts And Server Settings API

**Files:**
- Modify: `packages/shared/src/admin-api/settings.ts`
- Create: `packages/shared/src/public-api/settings.ts`
- Modify: `packages/shared/src/public-api/index.ts`
- Create: `packages/shared/src/admin-api/settings.test.ts`
- Modify: `packages/server/src/services/settings.ts`
- Modify: `packages/server/src/services/settings.test.ts`
- Modify: `packages/server/src/routes/admin-api-settings.test.ts`
- Modify: `packages/server/src/routes/api.ts`
- Create: `packages/server/src/routes/api-settings.test.ts`

**Interfaces:**
- Produces: `GeneralSettingsData.siteUrl: string`
- Produces: `GeneralSettingsData.faviconUrl: string`
- Produces: `PublicSettingsData`
- Produces: `PublicSettingsResponse`
- Produces: `SettingsService.getPublicSettings(): Promise<PublicSettings>`
- Produces: `GET /api/settings -> PublicSettingsResponse`

- [ ] **Step 1: Add failing shared contract tests**

Create `packages/shared/src/admin-api/settings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { updateGeneralSettingsSchema } from "./settings";

const validGeneralSettings = {
  siteName: "Worker Blog",
  siteDescription: "A test blog",
  siteUrl: "https://example.com",
  faviconUrl: "",
  adminEmail: "admin@example.com",
  timezone: "UTC",
  language: "en",
  maintenanceMode: false,
};

describe("updateGeneralSettingsSchema", () => {
  it("accepts site URL and empty favicon URL", () => {
    const result = updateGeneralSettingsSchema.safeParse(validGeneralSettings);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.siteUrl).toBe("https://example.com");
    expect(result.data.faviconUrl).toBe("");
  });

  it("accepts a valid favicon URL", () => {
    const result = updateGeneralSettingsSchema.safeParse({
      ...validGeneralSettings,
      faviconUrl: "https://example.com/favicon.ico",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid URLs", () => {
    const result = updateGeneralSettingsSchema.safeParse({
      ...validGeneralSettings,
      siteUrl: "not a url",
      faviconUrl: "also not a url",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ["siteUrl"] }),
        expect.objectContaining({ path: ["faviconUrl"] }),
      ]),
    );
  });
});
```

- [ ] **Step 2: Run shared settings test to verify it fails**

Run:

```bash
pnpm --filter @worker-blog/shared test src/admin-api/settings.test.ts
```

Expected: FAIL because `siteUrl` and `faviconUrl` are not in `updateGeneralSettingsSchema`.

- [ ] **Step 3: Extend shared admin and public settings contracts**

Modify `packages/shared/src/admin-api/settings.ts`:

```ts
import { z } from "zod";

const optionalUrlSchema = z.union([z.literal(""), z.url()]);

export interface GeneralSettingsData {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  faviconUrl: string;
  adminEmail: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
}

export interface SecuritySettingsData {
  jwtExpiresIn: string;
  jwtRefreshGraceSeconds: number;
}

export interface SettingsResponse {
  general: GeneralSettingsData;
  security: SecuritySettingsData;
}

export const updateGeneralSettingsSchema = z.object({
  siteName: z.string().min(1).max(255),
  siteDescription: z.string().min(1).max(1000),
  siteUrl: z.url(),
  faviconUrl: optionalUrlSchema,
  adminEmail: z.string().email(),
  timezone: z.string().min(1),
  language: z.string().min(1),
  maintenanceMode: z.boolean(),
});

export const updateSecuritySettingsSchema = z.object({
  jwtExpiresIn: z
    .string()
    .regex(/^\d+(?:s|m|h|d)?$/i, "Must be a number optionally suffixed with s/m/h/d"),
  jwtRefreshGraceSeconds: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 24 * 90),
});

export type UpdateGeneralSettingsRequest = z.infer<typeof updateGeneralSettingsSchema>;
export type UpdateSecuritySettingsRequest = z.infer<typeof updateSecuritySettingsSchema>;

export interface UpdateSettingsResponse {
  message: string;
}
```

Create `packages/shared/src/public-api/settings.ts`:

```ts
export interface PublicSettingsData {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  faviconUrl: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
}

export interface PublicSettingsResponse {
  data: PublicSettingsData;
}
```

Modify `packages/shared/src/public-api/index.ts`:

```ts
export * from "./contents";
export * from "./settings";
```

- [ ] **Step 4: Run shared settings test to verify it passes**

Run:

```bash
pnpm --filter @worker-blog/shared test src/admin-api/settings.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add failing server service and route tests**

Append to `packages/server/src/services/settings.test.ts` inside `describe("SettingsService", () => { ... })`:

```ts
  describe("site config settings", () => {
    it("returns general settings defaults with site URL and favicon URL", async () => {
      mockDb._mocks.all.mockResolvedValue({ results: [] });

      const result = await settingsService.getGeneralSettings("admin@example.com");

      expect(result).toEqual({
        siteName: "Worker Blog",
        siteDescription: "A modern headless CMS powered by AI",
        siteUrl: "",
        faviconUrl: "",
        adminEmail: "admin@example.com",
        timezone: "UTC",
        language: "en",
        maintenanceMode: false,
      });
    });

    it("saves site URL and favicon URL with general settings", async () => {
      mockDb._mocks.run.mockResolvedValue({ success: true });

      const result = await settingsService.saveGeneralSettings({
        siteUrl: "https://example.com",
        faviconUrl: "https://example.com/favicon.ico",
      });

      expect(result).toBe(true);
      expect(mockDb._mocks.bind).toHaveBeenCalledWith(
        expect.any(String),
        "general",
        "siteUrl",
        "\"https://example.com\"",
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockDb._mocks.bind).toHaveBeenCalledWith(
        expect.any(String),
        "general",
        "faviconUrl",
        "\"https://example.com/favicon.ico\"",
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("returns public settings without admin email", async () => {
      mockDb._mocks.all.mockResolvedValue({
        results: [
          { key: "siteName", value: "\"Public Blog\"" },
          { key: "siteDescription", value: "\"Public description\"" },
          { key: "siteUrl", value: "\"https://example.com\"" },
          { key: "faviconUrl", value: "\"https://example.com/favicon.ico\"" },
          { key: "adminEmail", value: "\"admin@example.com\"" },
          { key: "timezone", value: "\"Europe/Berlin\"" },
          { key: "language", value: "\"zh\"" },
          { key: "maintenanceMode", value: "true" },
        ],
      });

      const result = await settingsService.getPublicSettings();

      expect(result).toEqual({
        siteName: "Public Blog",
        siteDescription: "Public description",
        siteUrl: "https://example.com",
        faviconUrl: "https://example.com/favicon.ico",
        timezone: "Europe/Berlin",
        language: "zh",
        maintenanceMode: true,
      });
      expect(result).not.toHaveProperty("adminEmail");
    });
  });
```

Modify `mockGeneralSettings` in `packages/server/src/routes/admin-api-settings.test.ts`:

```ts
const mockGeneralSettings = {
  siteName: "Test Blog",
  siteDescription: "A test blog",
  siteUrl: "https://example.com",
  faviconUrl: "https://example.com/favicon.ico",
  adminEmail: "admin@test.com",
  timezone: "UTC",
  language: "en",
  maintenanceMode: false,
};
```

Add this assertion to `GET /api/admin/settings` test:

```ts
    expect(json.general.siteUrl).toBe("https://example.com");
    expect(json.general.faviconUrl).toBe("https://example.com/favicon.ico");
```

Create `packages/server/src/routes/api-settings.test.ts`:

```ts
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

const publicSettings = {
  siteName: "Public Blog",
  siteDescription: "Public description",
  siteUrl: "https://example.com",
  faviconUrl: "https://example.com/favicon.ico",
  timezone: "UTC",
  language: "en",
  maintenanceMode: false,
};

vi.mock("../services/settings", () => ({
  SettingsService: class {
    async getPublicSettings() {
      return publicSettings;
    }
  },
}));

import apiRoutes from "./api";

describe("GET /api/settings", () => {
  it("returns public settings without admin email", async () => {
    const app = new Hono();
    app.route("/api", apiRoutes);

    const res = await app.request("/api/settings", {}, { DB: {} });
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json).toEqual({ data: publicSettings });
    expect(JSON.stringify(json)).not.toContain("adminEmail");
  });
});
```

- [ ] **Step 6: Run server tests to verify they fail**

Run:

```bash
pnpm --filter @worker-blog/server test src/services/settings.test.ts src/routes/admin-api-settings.test.ts src/routes/api-settings.test.ts
```

Expected: FAIL because `SettingsService.getPublicSettings()` and `/api/settings` do not exist, and general settings types do not include new fields.

- [ ] **Step 7: Implement server settings and public endpoint**

Modify the top of `packages/server/src/services/settings.ts`:

```ts
export interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  faviconUrl: string;
  adminEmail: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
}

export interface PublicSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  faviconUrl: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
}
```

Update `getGeneralSettings()` in `packages/server/src/services/settings.ts`:

```ts
  async getGeneralSettings(userEmail?: string): Promise<GeneralSettings> {
    const settings = await this.getCategorySettings("general");

    return {
      siteName: settings.siteName || "Worker Blog",
      siteDescription: settings.siteDescription || "A modern headless CMS powered by AI",
      siteUrl: settings.siteUrl || "",
      faviconUrl: settings.faviconUrl || "",
      adminEmail: settings.adminEmail || userEmail || "admin@example.com",
      timezone: settings.timezone || "UTC",
      language: settings.language || "en",
      maintenanceMode: settings.maintenanceMode || false,
    };
  }
```

Update `saveGeneralSettings()` in `packages/server/src/services/settings.ts`:

```ts
  async saveGeneralSettings(settings: Partial<GeneralSettings>): Promise<boolean> {
    const settingsToSave: Record<string, any> = {};

    if (settings.siteName !== undefined) settingsToSave.siteName = settings.siteName;
    if (settings.siteDescription !== undefined)
      settingsToSave.siteDescription = settings.siteDescription;
    if (settings.siteUrl !== undefined) settingsToSave.siteUrl = settings.siteUrl;
    if (settings.faviconUrl !== undefined) settingsToSave.faviconUrl = settings.faviconUrl;
    if (settings.adminEmail !== undefined) settingsToSave.adminEmail = settings.adminEmail;
    if (settings.timezone !== undefined) settingsToSave.timezone = settings.timezone;
    if (settings.language !== undefined) settingsToSave.language = settings.language;
    if (settings.maintenanceMode !== undefined)
      settingsToSave.maintenanceMode = settings.maintenanceMode;

    return await this.setMultipleSettings("general", settingsToSave);
  }
```

Add `getPublicSettings()` to `SettingsService` in `packages/server/src/services/settings.ts`:

```ts
  async getPublicSettings(): Promise<PublicSettings> {
    const general = await this.getGeneralSettings();

    return {
      siteName: general.siteName,
      siteDescription: general.siteDescription,
      siteUrl: general.siteUrl,
      faviconUrl: general.faviconUrl,
      timezone: general.timezone,
      language: general.language,
      maintenanceMode: general.maintenanceMode,
    };
  }
```

Modify imports in `packages/server/src/routes/api.ts`:

```ts
import { schemaDefinitions } from "@worker-blog/shared/schemas";
import { type QueryFilter, QueryFilterBuilder } from "@worker-blog/shared/utils";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Variables as AppVariables, Bindings } from "../app";
import { optionalAuth } from "../middleware";
import { CACHE_CONFIGS, getCacheService, SettingsService } from "../services";
import { normalizePublicContentFilter } from "./api-content-access-policy";
import apiContentsCrudRoutes from "./api-contents-crud";
```

Add this route before `/category/:slug` in `packages/server/src/routes/api.ts`:

```ts
apiRoutes.get("/settings", async (c) => {
  const service = new SettingsService(c.env.DB);
  const settings = await service.getPublicSettings();

  return c.json({ data: settings });
});
```

- [ ] **Step 8: Run server and shared tests to verify they pass**

Run:

```bash
pnpm --filter @worker-blog/shared test src/admin-api/settings.test.ts
pnpm --filter @worker-blog/server test src/services/settings.test.ts src/routes/admin-api-settings.test.ts src/routes/api-settings.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 1**

Run:

```bash
git add packages/shared/src/admin-api/settings.ts packages/shared/src/admin-api/settings.test.ts packages/shared/src/public-api/settings.ts packages/shared/src/public-api/index.ts packages/server/src/services/settings.ts packages/server/src/services/settings.test.ts packages/server/src/routes/admin-api-settings.test.ts packages/server/src/routes/api.ts packages/server/src/routes/api-settings.test.ts
git commit -m "feat: add public site settings API"
```

Expected: commit succeeds.

---

### Task 2: Admin General Settings Form

**Files:**
- Modify: `packages/admin/src/pages/settings.tsx`

**Interfaces:**
- Consumes: `GeneralSettingsData.siteUrl: string`
- Consumes: `GeneralSettingsData.faviconUrl: string`
- Produces: admin General form submits `siteUrl` and `faviconUrl` to `useUpdateGeneralSettings()`

- [ ] **Step 1: Update General form payload**

Modify `handleSubmit()` in `packages/admin/src/pages/settings.tsx`:

```tsx
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const form = new FormData(e.currentTarget);
    await mutation.mutateAsync({
      siteName: String(form.get("siteName") || ""),
      siteDescription: String(form.get("siteDescription") || ""),
      siteUrl: String(form.get("siteUrl") || ""),
      faviconUrl: String(form.get("faviconUrl") || ""),
      adminEmail: String(form.get("adminEmail") || ""),
      timezone: String(form.get("timezone") || "UTC"),
      language: String(form.get("language") || "en"),
      maintenanceMode: form.get("maintenanceMode") === "on",
    });
    setSaved(true);
  }
```

- [ ] **Step 2: Add General form inputs**

Add these fields after `Site description` in `packages/admin/src/pages/settings.tsx`:

```tsx
      <FieldRow label="Site URL">
        <Input name="siteUrl" type="url" defaultValue={g.siteUrl} required />
      </FieldRow>
      <FieldRow label="Favicon URL">
        <Input name="faviconUrl" type="url" defaultValue={g.faviconUrl} />
      </FieldRow>
```

- [ ] **Step 3: Type-check admin**

Run:

```bash
pnpm --filter @worker-blog/admin type-check
```

Expected: PASS.

- [ ] **Step 4: Commit Task 2**

Run:

```bash
git add packages/admin/src/pages/settings.tsx
git commit -m "feat: add site URL and favicon settings"
```

Expected: commit succeeds.

---

### Task 3: www Public Settings Consumption

**Files:**
- Modify: `packages/www/src/lib/server/api.ts`
- Create: `packages/www/src/lib/server/api.test.ts`
- Create: `packages/www/src/routes/+layout.server.ts`
- Modify: `packages/www/src/routes/+layout.svelte`

**Interfaces:**
- Consumes: `PublicSettingsResponse` from `@worker-blog/shared/public-api`
- Produces: `fetchPublicSettings(eventFetch: SvelteFetch): Promise<PublicSettingsResponse>`
- Produces: root layout data with `settings: PublicSettingsData`

- [ ] **Step 1: Add failing www API helper test**

Create `packages/www/src/lib/server/api.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { fetchPublicSettings } from "./api";

vi.mock("$env/dynamic/private", () => ({
  env: {
    API_BASE_URL: "https://api.example.com",
  },
}));

describe("fetchPublicSettings", () => {
  it("returns public settings from the API", async () => {
    const eventFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          siteName: "Public Blog",
          siteDescription: "Public description",
          siteUrl: "https://example.com",
          faviconUrl: "https://example.com/favicon.ico",
          timezone: "UTC",
          language: "en",
          maintenanceMode: false,
        },
      }),
    });

    const result = await fetchPublicSettings(eventFetch as any);

    expect(eventFetch).toHaveBeenCalledWith("https://api.example.com/api/settings");
    expect(result.data.siteName).toBe("Public Blog");
  });
});
```

- [ ] **Step 2: Run www helper test to verify it fails**

Run:

```bash
pnpm --filter @worker-blog/www test src/lib/server/api.test.ts
```

Expected: FAIL because `fetchPublicSettings` does not exist.

- [ ] **Step 3: Add www settings fetch helper**

Modify imports in `packages/www/src/lib/server/api.ts`:

```ts
import { error } from "@sveltejs/kit";
import type {
  PublicCategoryContentsResponse,
  PublicContentDetailResponse,
  PublicContentListResponse,
  PublicSettingsResponse,
  PublicTagContentsResponse,
} from "@worker-blog/shared/public-api";
import { env } from "$env/dynamic/private";
```

Add this function to `packages/www/src/lib/server/api.ts`:

```ts
export function fetchPublicSettings(eventFetch: SvelteFetch) {
  return getJson<PublicSettingsResponse>(eventFetch, "/api/settings");
}
```

- [ ] **Step 4: Run www helper test to verify it passes**

Run:

```bash
pnpm --filter @worker-blog/www test src/lib/server/api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add root layout server load**

Create `packages/www/src/routes/+layout.server.ts`:

```ts
import { fetchPublicSettings } from "$lib/server/api";
import type { LayoutServerLoad } from "./$types";

const fallbackSettings = {
  siteName: "Worker Blog",
  siteDescription: "A modern headless CMS powered by AI",
  siteUrl: "",
  faviconUrl: "",
  timezone: "UTC",
  language: "en",
  maintenanceMode: false,
};

export const load: LayoutServerLoad = async ({ fetch }) => {
  try {
    const response = await fetchPublicSettings(fetch);
    return { settings: response.data };
  } catch {
    return { settings: fallbackSettings };
  }
};
```

- [ ] **Step 6: Update root layout metadata and maintenance mode**

Modify `packages/www/src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import { browser } from "$app/environment"

  let { children, data } = $props()

  const settings = $derived(data.settings)
  const siteUrl = $derived(settings.siteUrl.replace(/\/$/, ""))
  const canonicalUrl = $derived(siteUrl || "")

  $effect(() => {
    if (browser) {
      // ponytail: SvelteKit app.html owns SSR <html>; server-side dynamic lang needs a hook later.
      document.documentElement.lang = settings.language || "en"
    }
  })
</script>

<svelte:head>
  <title>{settings.siteName}</title>
  <meta name="description" content={settings.siteDescription} />
  <meta property="og:site_name" content={settings.siteName} />
  <meta property="og:title" content={settings.siteName} />
  <meta property="og:description" content={settings.siteDescription} />
  {#if canonicalUrl}
    <link rel="canonical" href={canonicalUrl} />
    <meta property="og:url" content={canonicalUrl} />
  {/if}
  {#if settings.faviconUrl}
    <link rel="icon" href={settings.faviconUrl} />
  {/if}
</svelte:head>

{#if settings.maintenanceMode}
  <main>
    <h1>{settings.siteName}</h1>
    <p>{settings.siteDescription}</p>
    <hr />
    <p>Maintenance in progress.</p>
  </main>
{:else}
  <header class="site-header">
    <h1><a href="/">{settings.siteName}</a></h1>
    <p>{settings.siteDescription}</p>
    <hr />
  </header>

  <main>
    {@render children()}
  </main>

  <footer>
    <hr />
    <small>Best viewed with a standards-compliant browser.</small>
  </footer>
{/if}

<style>
  :global(body) {
    max-width: 760px;
    margin: 8px;
    font-family: "Times New Roman", Times, serif;
  }

  @media (min-width: 800px) {
    :global(body) {
      margin: 8px auto;
    }
  }

  .site-header h1 {
    margin-bottom: 0;
  }
</style>
```

- [ ] **Step 7: Run www tests and type-check**

Run:

```bash
pnpm --filter @worker-blog/www test src/lib/server/api.test.ts
pnpm --filter @worker-blog/www type-check
```

Expected: PASS.

- [ ] **Step 8: Commit Task 3**

Run:

```bash
git add packages/www/src/lib/server/api.ts packages/www/src/lib/server/api.test.ts packages/www/src/routes/+layout.server.ts packages/www/src/routes/+layout.svelte
git commit -m "feat: use site settings on www"
```

Expected: commit succeeds.

---

### Task 4: Final Verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes all prior task outputs.

- [ ] **Step 1: Run focused package tests**

Run:

```bash
pnpm --filter @worker-blog/shared test src/admin-api/settings.test.ts
pnpm --filter @worker-blog/server test src/services/settings.test.ts src/routes/admin-api-settings.test.ts src/routes/api-settings.test.ts
pnpm --filter @worker-blog/www test src/lib/server/api.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run type-check**

Run:

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Inspect migration files were not changed**

Run:

```bash
git status --short packages/server/migrations
```

Expected: no output.

- [ ] **Step 4: Inspect final status**

Run:

```bash
git status --short
```

Expected: no unstaged implementation files. If the only changed file is this plan during planning, commit it separately before implementation.

---

## Self-Review

- Spec coverage: General gets `siteUrl` and `faviconUrl`; public API excludes `adminEmail`; admin UI submits new fields; `www` consumes branding, metadata, favicon, and maintenance mode; Security remains unchanged; no migration files are changed.
- Scope check: SEO tab, article-level SEO, sitemap, robots, search verification, default OG image, favicon upload, and security audit settings are intentionally deferred.
- Type consistency: `siteUrl`, `faviconUrl`, `PublicSettingsData`, `PublicSettingsResponse`, and `getPublicSettings()` names match across tasks.
