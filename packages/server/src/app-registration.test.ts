import { beforeEach, describe, expect, it, vi } from "vitest";
import { SETUP_REQUIRED_CODE } from "@worker-blog/shared/admin-api";
import { createWorkerBlogApp } from "./app";
import { resetAdminExistsCache } from "./services/auth-validation";

function createDb(adminExists = true) {
  const first = vi.fn().mockResolvedValue(adminExists ? { id: "admin-1" } : null);
  const bind = vi.fn(() => ({ first }));
  const prepare = vi.fn(() => ({ bind }));

  return { prepare };
}

function createTestEnv(overrides: Record<string, unknown> = {}, adminExists = true) {
  return {
    DB: createDb(adminExists),
    CACHE_KV: {},
    MEDIA_BUCKET: {
      get: vi.fn().mockResolvedValue(null),
    },
    ASSETS: {
      fetch: vi.fn().mockResolvedValue(
        new Response('<div id="admin-root"></div>', {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    },
    ...overrides,
  };
}

describe("createWorkerBlogApp route smoke tests", () => {
  beforeEach(() => {
    resetAdminExistsCache();
  });

  it("mounts public API discovery and health routes", async () => {
    const app = createWorkerBlogApp({ name: "Smoke App", version: "1.2.3" });
    const env = createTestEnv();

    const apiRes = await app.request("/api", {}, env);
    const healthRes = await app.request("/api/health", {}, env);
    const healthJson = (await healthRes.json()) as { status: string };

    expect(apiRes.status).toBe(200);
    expect(healthRes.status).toBe(200);
    expect(healthJson).toMatchObject({
      status: "healthy",
    });
  });

  it("returns setup required for API routes when no admin exists", async () => {
    const app = createWorkerBlogApp();
    const env = createTestEnv({}, false);

    const apiRes = await app.request("/api", {}, env);
    const healthRes = await app.request("/api/health", {}, env);
    const apiJson = (await apiRes.json()) as { error: string; code: string };

    expect(apiRes.status).toBe(428);
    expect(apiJson).toEqual({
      error: "Initial admin account is required",
      code: SETUP_REQUIRED_CODE,
    });
    expect(healthRes.status).toBe(200);
  });

  it("mounts admin content routes behind the admin auth guard", async () => {
    const app = createWorkerBlogApp();

    const res = await app.request(
      "/api/admin/content",
      {},
      createTestEnv(),
    );
    const json = (await res.json()) as { error: string };

    expect(res.status).toBe(401);
    expect(json.error).toBe("Authentication required");
  });

  it("mounts SPA fallback and R2 file surfaces", async () => {
    const app = createWorkerBlogApp();
    const env = createTestEnv();

    const adminRes = await app.request(
      "/admin/smoke",
      {
        headers: { Accept: "text/html" },
      },
      env,
    );
    const fileRes = await app.request("/files/missing.png", {}, env);

    expect(adminRes.status).toBe(200);
    expect(await adminRes.text()).toContain("admin-root");
    expect(fileRes.status).toBe(404);
  });
});
