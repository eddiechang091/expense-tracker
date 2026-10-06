import { describe, it, expect } from "vitest";
import { checkBadgeUnlocks, badgeDefById, BADGE_DEFS } from "@/features/gamification/badges";
import type { BadgeContext } from "@/features/gamification/badges";

function ctx(over: Partial<BadgeContext> = {}): BadgeContext {
  return {
    streak: { current: 0, longest: 0, totalDays: 0, lastActiveDate: null, aliveButIdleToday: false },
    expenseCount: 0,
    budgetCount: 0,
    hasChatted: false,
    ...over,
  };
}

describe("checkBadgeUnlocks", () => {
  it("unlocks first-expense on the first log", () => {
    expect(checkBadgeUnlocks(new Set(), ctx({ expenseCount: 1 }))).toEqual(["first-expense"]);
  });

  it("unlocks streak badges from longest run too", () => {
    const ids = checkBadgeUnlocks(
      new Set(["first-expense"]),
      ctx({
        expenseCount: 10,
        streak: { current: 1, longest: 7, totalDays: 10, lastActiveDate: "2026-10-01", aliveButIdleToday: false },
      })
    );
    expect(ids).toContain("streak-3");
    expect(ids).toContain("streak-7");
    expect(ids).not.toContain("streak-30");
  });

  it("does not re-unlock already earned badges", () => {
    const ids = checkBadgeUnlocks(new Set(BADGE_DEFS.map((b) => b.id)), ctx({ expenseCount: 100 }));
    expect(ids).toEqual([]);
  });

  it("unlocks budget and chat badges", () => {
    const ids = checkBadgeUnlocks(new Set(), ctx({ budgetCount: 1, hasChatted: true }));
    expect(ids).toEqual(expect.arrayContaining(["budget-setter", "buddy-chat"]));
  });
});

describe("badgeDefById", () => {
  it("finds every def", () => {
    for (const d of BADGE_DEFS) expect(badgeDefById(d.id)).toBe(d);
  });
  it("returns undefined for unknown ids", () => {
    expect(badgeDefById("nope")).toBeUndefined();
  });
});
