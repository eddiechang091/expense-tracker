import { describe, it, expect } from "vitest";
import {
  buildDelightMessages,
  fallbackDelight,
  cleanDelightText,
  FALLBACK_DELIGHTS,
} from "@/features/delight/dailyDelight";

describe("buildDelightMessages", () => {
  it("builds a system + user message pair", () => {
    const msgs = buildDelightMessages([]);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
  });

  it("includes recent delights to avoid repetition", () => {
    const msgs = buildDelightMessages(["old delight one", "old delight two"]);
    expect(msgs[1].content).toContain("old delight one");
    expect(msgs[1].content).toContain("old delight two");
  });

  it("omits the avoid-list when empty", () => {
    const msgs = buildDelightMessages([]);
    expect(msgs[1].content).not.toContain("different from");
  });
});

describe("fallbackDelight", () => {
  it("is deterministic per date and varies across dates", () => {
    const a = fallbackDelight("2026-10-05");
    const b = fallbackDelight("2026-10-05");
    const c = fallbackDelight("2026-10-06");
    expect(a.text).toBe(b.text);
    expect(FALLBACK_DELIGHTS).toContain(a.text);
    expect(a.fallback).toBe(true);
    expect(a.date).toBe("2026-10-05");
    // Adjacent days differ (pool is longer than 1)
    expect(c.text).not.toBe(a.text);
  });
});

describe("cleanDelightText", () => {
  it("strips quotes and keeps the first line", () => {
    expect(cleanDelightText('"Warm socks on a cold floor."\nExtra line')).toBe(
      "Warm socks on a cold floor."
    );
  });
});
