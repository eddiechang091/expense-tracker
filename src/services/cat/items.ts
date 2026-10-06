// Interactive lucky cat — item catalog (18 items).
//
// Foods are consumed by 喂食, toys by 玩耍, care items by 按摩梳毛.
// Rarity gates the reward tables: longer history -> rarer drops.

import type { CatItem } from "./types";

export const CAT_ITEMS: CatItem[] = [
  // ---- Foods (7) ----
  { id: "food-kibble", name: "普通猫粮", emoji: "🍪", kind: "food", rarity: "common", happiness: 8, blurb: "香脆可口的主食" },
  { id: "food-chicken", name: "鸡胸肉丝", emoji: "🍗", kind: "food", rarity: "common", happiness: 10, blurb: "低脂高蛋白" },
  { id: "food-tuna", name: "金枪鱼罐头", emoji: "🐟", kind: "food", rarity: "rare", happiness: 14, blurb: "猫咪无法抗拒的香味" },
  { id: "food-salmon", name: "三文鱼排", emoji: "🍣", kind: "food", rarity: "rare", happiness: 16, blurb: "深海美味，闪闪发光" },
  { id: "food-strip", name: "猫条", emoji: "🧃", kind: "food", rarity: "common", happiness: 9, blurb: "一挤就停不下来" },
  { id: "food-pudding", name: "猫布丁", emoji: "🍮", kind: "food", rarity: "rare", happiness: 13, blurb: "Q弹滑嫩的甜点" },
  { id: "food-dried-fish", name: "冻干小鱼", emoji: "🐠", kind: "food", rarity: "epic", happiness: 20, blurb: "传说中的顶级小食" },

  // ---- Care (4) ----
  { id: "care-mint", name: "猫薄荷", emoji: "🌿", kind: "care", rarity: "common", happiness: 10, blurb: "闻一闻就开心打滚" },
  { id: "care-silvervine", name: "木天蓼", emoji: "🪵", kind: "care", rarity: "rare", happiness: 15, blurb: "比猫薄荷更上头" },
  { id: "care-paste", name: "化毛膏", emoji: "🧴", kind: "care", rarity: "common", happiness: 7, blurb: "毛球拜拜" },
  { id: "care-brush", name: "按摩梳", emoji: "🪮", kind: "care", rarity: "rare", happiness: 14, blurb: "梳毛按摩两不误" },

  // ---- Toys (7) ----
  { id: "toy-wand", name: "逗猫棒", emoji: "🪶", kind: "toy", rarity: "common", happiness: 12, blurb: "羽毛飞舞，快乐追逐" },
  { id: "toy-yarn", name: "毛线球", emoji: "🧶", kind: "toy", rarity: "common", happiness: 9, blurb: "滚来滚去真好玩" },
  { id: "toy-bell", name: "铃铛球", emoji: "🔔", kind: "toy", rarity: "common", happiness: 10, blurb: "叮叮当当响不停" },
  { id: "toy-laser", name: "激光笔", emoji: "🔦", kind: "toy", rarity: "rare", happiness: 15, blurb: "永远抓不到的小红点" },
  { id: "toy-box", name: "纸箱", emoji: "📦", kind: "toy", rarity: "common", happiness: 8, blurb: "猫的终极豪宅" },
  { id: "toy-scratcher", name: "猫抓板", emoji: "🛋️", kind: "toy", rarity: "rare", happiness: 12, blurb: "磨爪子的快乐天堂" },
  { id: "toy-mouse", name: "小老鼠玩具", emoji: "🐭", kind: "toy", rarity: "epic", happiness: 18, blurb: "会动的猎物最刺激" },
];

const BY_ID = new Map(CAT_ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): CatItem | undefined {
  return BY_ID.get(id);
}

/** Weighted random pick honoring rarity. Longer history unlocks rarer pools. */
export function randomItem(rarityBoost = 0): CatItem {
  // rarityBoost 0 -> common-heavy; 1 -> rare-friendly; 2 -> epic possible
  const roll = Math.random();
  let rarity: CatItem["rarity"] = "common";
  if (rarityBoost >= 2 && roll > 0.82) rarity = "epic";
  else if (rarityBoost >= 1 && roll > 0.55) rarity = "rare";
  else if (roll > 0.85) rarity = "rare";
  const pool = CAT_ITEMS.filter((i) => i.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Pick n items (may repeat) for a reward bundle. */
export function randomItems(n: number, rarityBoost = 0): CatItem[] {
  return Array.from({ length: n }, () => randomItem(rarityBoost));
}
