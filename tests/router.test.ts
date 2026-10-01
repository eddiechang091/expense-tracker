import { describe, expect, it } from "vitest";
import { normalizeHash } from "@/router";

describe("normalizeHash", () => {
  it("defaults to the dashboard", () => {
    expect(normalizeHash("")).toBe("/dashboard");
    expect(normalizeHash("#")).toBe("/dashboard");
  });
  it("normalizes bare paths", () => {
    expect(normalizeHash("#expenses")).toBe("/expenses");
  });
  it("keeps leading slashes", () => {
    expect(normalizeHash("#/settings")).toBe("/settings");
  });
});
