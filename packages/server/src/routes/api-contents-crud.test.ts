import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import apiContentsCrudRoutes from "./api-contents-crud";

const publishedRow = {
  id: "c1",
  title: "Published Post",
  slug: "published-post",
  excerpt: "Short",
  body_html: "<p>Published</p>",
  status: "published",
  cover_image_id: null,
  metadata: "{}",
  published_at: 1700000000,
  created_at: 1700000000,
  updated_at: 1700000000,
  deleted_at: null,
};

function createApp(row: unknown) {
  const app = new Hono();
  const db = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("slug = ?") && args[0] === "published-post") return row;
          return null;
        },
      }),
    }),
  };
  app.route("/api/contents", apiContentsCrudRoutes);
  return { app, env: { DB: db } };
}

describe("GET /api/contents/slug/:slug", () => {
  it("returns published content by slug with bodyHtml", async () => {
    const { app, env } = createApp(publishedRow);
    const res = await app.request("/api/contents/slug/published-post", {}, env);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.data.slug).toBe("published-post");
    expect(json.data.bodyHtml).toBe("<p>Published</p>");
    expect(json.data).not.toHaveProperty("bodyJson");
  });

  it("returns 404 when slug is missing or unpublished", async () => {
    const { app, env } = createApp(null);
    const res = await app.request("/api/contents/slug/draft-post", {}, env);

    expect(res.status).toBe(404);
  });
});
