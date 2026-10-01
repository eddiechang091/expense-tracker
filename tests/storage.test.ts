import { beforeEach, describe, expect, it } from "vitest";
import { getKvStore, resetKvStore } from "@/services/anna/storage";

describe("kv store (standalone fallback)", () => {
  beforeEach(() => {
    resetKvStore();
  });

  it("round-trips a value", async () => {
    const store = await getKvStore();
    await store.set("test:value", { hello: "world" });
    const value = await store.get<{ hello: string }>("test:value");
    expect(value).toEqual({ hello: "world" });
  });

  it("returns null for missing keys", async () => {
    const store = await getKvStore();
    const value = await store.get("test:missing");
    expect(value).toBeNull();
  });
});
