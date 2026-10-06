// Interactive lucky cat — milestone rewards.
//
// Milestones reward consistent expense logging. The longer the history,
// the richer the reward (more items + rarer pool). Shown next to badges
// on the profile page.

import type { ExpenseStats, Milestone } from "./types";
import { randomItems } from "./items";

/** Rarity boost from history length: 0 = new, 1 = established, 2 = veteran. */
export function historyRarityBoost(stats: ExpenseStats): number {
  if (stats.longestStreak >= 30 || stats.totalExpenses >= 200) return 2;
  if (stats.longestStreak >= 7 || stats.totalExpenses >= 50) return 1;
  return 0;
}

export const CAT_MILESTONES: Milestone[] = [
  {
    id: "log-3-days",
    title: "3-Day Logger",
    description: "Log expenses 3 days in a row",
    rewards: [],
    isUnlocked: (s) => s.longestStreak >= 3,
  },
  {
    id: "log-7-days",
    title: "7-Day Logger",
    description: "Log expenses 7 days in a row",
    rewards: [],
    isUnlocked: (s) => s.longestStreak >= 7,
  },
  {
    id: "log-14-days",
    title: "14-Day Logger",
    description: "Log expenses 14 days in a row",
    rewards: [],
    isUnlocked: (s) => s.longestStreak >= 14,
  },
  {
    id: "log-30-days",
    title: "30-Day Logger",
    description: "Log expenses 30 days in a row",
    rewards: [],
    isUnlocked: (s) => s.longestStreak >= 30,
  },
  {
    id: "expenses-50",
    title: "50 Expenses",
    description: "Log 50 expenses in total",
    rewards: [],
    isUnlocked: (s) => s.totalExpenses >= 50,
  },
  {
    id: "expenses-100",
    title: "100 Expenses",
    description: "Log 100 expenses in total",
    rewards: [],
    isUnlocked: (s) => s.totalExpenses >= 100,
  },
  {
    id: "checkin-7",
    title: "7-Day Check-in",
    description: "Check in with the lucky cat 7 days in a row",
    rewards: [],
    isUnlocked: (_s, checkinStreak) => checkinStreak >= 7,
  },
];

/** Reward bundle sizes grow with milestone tier. */
const REWARD_SIZES: Record<string, number> = {
  "log-3-days": 2,
  "log-7-days": 3,
  "log-14-days": 4,
  "log-30-days": 6,
  "expenses-50": 3,
  "expenses-100": 5,
  "checkin-7": 4,
};

/** Roll the reward items for a milestone (uses history-based rarity). */
export function rollMilestoneRewards(milestoneId: string, stats: ExpenseStats): string[] {
  const n = REWARD_SIZES[milestoneId] ?? 2;
  const boost = historyRarityBoost(stats);
  return randomItems(n, boost).map((i) => i.id);
}
