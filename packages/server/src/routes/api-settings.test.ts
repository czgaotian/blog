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
