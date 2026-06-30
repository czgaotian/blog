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
