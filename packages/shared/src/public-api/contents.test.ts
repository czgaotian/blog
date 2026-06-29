import { describe, expect, it } from "vitest";
import type { PublicContentDetailResponse } from "./contents";

describe("public content contracts", () => {
  it("keeps public detail body as rendered HTML only", () => {
    const response: PublicContentDetailResponse = {
      data: {
        id: "c1",
        title: "Hello",
        slug: "hello",
        excerpt: null,
        status: "published",
        cover_image_id: null,
        metadata: {},
        published_at: 1700000000,
        created_at: 1700000000,
        updated_at: 1700000000,
        bodyHtml: "<p>Hello</p>",
      },
    };

    expect(response.data.bodyHtml).toBe("<p>Hello</p>");
    expect(response.data).not.toHaveProperty("bodyJson");
  });
});
