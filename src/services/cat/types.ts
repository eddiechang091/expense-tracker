// Interactive 2D lucky cat companion — types.

export type ItemKind = "food" | "toy" | "care";
export type ItemRarity = "common" | "rare" | "epic";

export interface CatItem {
  id: string;
  name: string;
  emoji: string;
  kind: ItemKind;
  rarity: ItemRarity;
  /** Happiness gained when the item is used. */
  happiness: number;
  blurb: string;
}

/** Inventory: item id -> count owned. */
export type Inventory = Record<string, number>;

export interface CatState {
  /** 0-100. Decays slowly; raised by interactions. (Mood 心情) */
  happiness: number;
  /** 0-100. Decays over time; raised by feeding. (Satiety 饱食) */
  satiety: number;
  /** 0-100. Decays over time; raised by grooming / cleaning litter. (Cleanliness 清洁) */
  cleanliness: number;
  /** 0-100. Drained by play; restored by sleep. (Energy 精力) */
  energy: number;
  asleep: boolean;
  inventory: Inventory;
  /** YYYY-MM-DD of the last successful check-in, local date. */
  lastCheckinDate: string | null;
  checkinStreak: number;
  /** Milestone ids already claimed. */
  claimedMilestones: string[];
  /** Epoch ms of the last random drop (rate-limit). */
  lastDropAt: number | null;
  /** Epoch ms of last state save (for stat decay). */
  updatedAt: number;
}

export const DEFAULT_CAT_STATE: CatState = {
  happiness: 50,
  satiety: 60,
  cleanliness: 60,
  energy: 80,
  asleep: false,
  inventory: {},
  lastCheckinDate: null,
  checkinStreak: 0,
  claimedMilestones: [],
  lastDropAt: null,
  updatedAt: Date.now(),
};

/** Expense stats the milestone system reads. */
export interface ExpenseStats {
  /** Current consecutive logging streak in days. */
  streakDays: number;
  /** Longest streak ever. */
  longestStreak: number;
  /** Total number of logged expenses. */
  totalExpenses: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  /** Item ids granted when claimed. */
  rewards: string[];
  isUnlocked: (stats: ExpenseStats, checkinStreak: number) => boolean;
}
