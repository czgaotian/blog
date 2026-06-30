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
