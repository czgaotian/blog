import { describe, expect, it } from "vitest";
import { formatDate } from "./content";

describe("formatDate", () => {
  it("formats epoch millisecond timestamps", () => {
    expect(formatDate(1700000000000)).toBe("Nov 14, 2023");
  });

  it("returns empty string for null dates", () => {
    expect(formatDate(null)).toBe("");
  });
});
