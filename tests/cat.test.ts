import { describe, expect, it } from "vitest";
import { CAT_ITEMS, getItem, randomItem, randomItems } from "@/services/cat/items";
import { historyRarityBoost, rollMilestoneRewards, CAT_MILESTONES } from "@/services/cat/milestones";

describe("cat item catalog", () => {
  it("has 18 items across food/toy/care", () => {
    expect(CAT_ITEMS).toHaveLength(18);
    const kinds = new Set(CAT_ITEMS.map((i) => i.kind));
    expect(kinds).toEqual(new Set(["food", "toy", "care"]));
  });

  it("ids are unique", () => {
    const ids = CAT_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getItem resolves known ids", () => {
    expect(getItem("food-tuna")?.name).toBe("金枪鱼罐头");
    expect(getItem("nope")).toBeUndefined();
  });

  it("randomItem honors rarity pools", () => {
    // With boost 2, epic should appear sometimes over many rolls.
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(randomItem(2).rarity);
    expect(seen.has("epic")).toBe(true);
    // With boost 0, epic should never appear.
    const seen0 = new Set<string>();
    for (let i = 0; i < 200; i++) seen0.add(randomItem(0).rarity);
    expect(seen0.has("epic")).toBe(false);
  });

  it("randomItems returns n items", () => {
    expect(randomItems(5)).toHaveLength(5);
  });
});

describe("cat milestones", () => {
  it("rarity boost scales with history", () => {
    expect(historyRarityBoost({ streakDays: 0, longestStreak: 0, totalExpenses: 0 })).toBe(0);
    expect(historyRarityBoost({ streakDays: 0, longestStreak: 7, totalExpenses: 0 })).toBe(1);
    expect(historyRarityBoost({ streakDays: 0, longestStreak: 0, totalExpenses: 50 })).toBe(1);
    expect(historyRarityBoost({ streakDays: 0, longestStreak: 30, totalExpenses: 0 })).toBe(2);
    expect(historyRarityBoost({ streakDays: 0, longestStreak: 0, totalExpenses: 200 })).toBe(2);
  });

  it("milestone unlock conditions", () => {
    const stats = { streakDays: 5, longestStreak: 7, totalExpenses: 60 };
    const byId = new Map(CAT_MILESTONES.map((m) => [m.id, m]));
    expect(byId.get("log-3-days")!.isUnlocked(stats, 0)).toBe(true);
    expect(byId.get("log-7-days")!.isUnlocked(stats, 0)).toBe(true);
    expect(byId.get("log-14-days")!.isUnlocked(stats, 0)).toBe(false);
    expect(byId.get("expenses-50")!.isUnlocked(stats, 0)).toBe(true);
    expect(byId.get("expenses-100")!.isUnlocked(stats, 0)).toBe(false);
    expect(byId.get("checkin-7")!.isUnlocked(stats, 7)).toBe(true);
    expect(byId.get("checkin-7")!.isUnlocked(stats, 3)).toBe(false);
  });

  it("reward bundles grow with tier", () => {
    const stats = { streakDays: 0, longestStreak: 30, totalExpenses: 100 };
    expect(rollMilestoneRewards("log-3-days", stats)).toHaveLength(2);
    expect(rollMilestoneRewards("log-30-days", stats)).toHaveLength(6);
    // All reward ids resolve to real items.
    for (const id of rollMilestoneRewards("log-30-days", stats)) {
      expect(getItem(id)).toBeDefined();
    }
  });
});
