import { useEffect, useMemo, useRef, useState } from "react";
import type { Expense } from "@/lib/types";
import { computeStreak, buildHeatmap, type StreakInfo, type HeatmapDay } from "@/lib/streak";
import { getKvStore } from "@/services/anna/storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { loadConversation } from "@/features/ai/conversationStorage";
import {
  checkBadgeUnlocks,
  badgeDefById,
  type BadgeDef,
} from "./badges";

export interface Gamification {
  streak: StreakInfo;
  heatmap: HeatmapDay[][];
  unlockedIds: Set<string>;
  /** Badges unlocked during this session (for celebration). */
  newlyUnlocked: BadgeDef[];
}

/**
 * Compute streak + heatmap from expenses, check badge unlocks against
 * persisted state, persist new unlocks. New unlocks are returned once
 * so the UI can celebrate them.
 */
export function useGamification(expenses: Expense[], budgetCount: number): Gamification {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [newlyUnlocked, setNewlyUnlocked] = useState<BadgeDef[]>([]);
  const checkedRef = useRef(false);

  const streak = useMemo(() => computeStreak(expenses), [expenses]);
  const heatmap = useMemo(() => buildHeatmap(expenses), [expenses]);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    (async () => {
      const store = await getKvStore();
      const persisted =
        (await store.get<Record<string, string>>(STORAGE_KEYS.badgesUnlocked)) ?? {};
      const already = new Set(Object.keys(persisted));

      // Persist longest streak as a safety net (survives expense deletion).
      const persistedLongest = (await store.get<number>(STORAGE_KEYS.longestStreak)) ?? 0;
      const longest = Math.max(streak.longest, persistedLongest);
      if (longest > persistedLongest) {
        await store.set(STORAGE_KEYS.longestStreak, longest);
      }

      const conversation = await loadConversation().catch(() => null);
      const hasChatted = !!conversation && conversation.messages.length > 0;

      const fresh = checkBadgeUnlocks(already, {
        streak: { ...streak, longest },
        expenseCount: expenses.length,
        budgetCount,
        hasChatted,
      });

      if (fresh.length > 0) {
        const now = new Date().toISOString();
        const next = { ...persisted };
        for (const id of fresh) next[id] = now;
        await store.set(STORAGE_KEYS.badgesUnlocked, next);
        const defs = fresh
          .map(badgeDefById)
          .filter((d): d is BadgeDef => !!d);
        setNewlyUnlocked(defs);
      }
      setUnlockedIds(new Set([...already, ...fresh]));
    })();
  }, [expenses, budgetCount, streak]);

  return { streak, heatmap, unlockedIds, newlyUnlocked };
}
