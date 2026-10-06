import type { StreakInfo } from "@/lib/streak";

// ---------------------------------------------------------------------------
// Badges — small achievements that reward consistent logging.
// ---------------------------------------------------------------------------

export interface BadgeDef {
  id: string;
  emoji: string;
  name: string;
  hint: string;
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: "first-expense", emoji: "🌱", name: "First Steps", hint: "Log your first expense" },
  { id: "streak-3", emoji: "🔥", name: "Warming Up", hint: "Log 3 days in a row" },
  { id: "streak-7", emoji: "⚡", name: "On Fire", hint: "Log 7 days in a row" },
  { id: "streak-30", emoji: "🏆", name: "Unstoppable", hint: "Log 30 days in a row" },
  { id: "streak-100", emoji: "💎", name: "Diamond", hint: "Log 100 days in a row" },
  { id: "expenses-50", emoji: "📝", name: "Record Keeper", hint: "Log 50 expenses" },
  { id: "budget-setter", emoji: "🎯", name: "Goal Setter", hint: "Set your first budget" },
  { id: "buddy-chat", emoji: "💬", name: "Good Talk", hint: "Chat with Money Buddy" },
];

export interface BadgeContext {
  streak: StreakInfo;
  expenseCount: number;
  budgetCount: number;
  hasChatted: boolean;
}

function unlocked(ctx: BadgeContext, id: string): boolean {
  switch (id) {
    case "first-expense":
      return ctx.expenseCount >= 1;
    case "streak-3":
      return ctx.streak.current >= 3 || ctx.streak.longest >= 3;
    case "streak-7":
      return ctx.streak.current >= 7 || ctx.streak.longest >= 7;
    case "streak-30":
      return ctx.streak.current >= 30 || ctx.streak.longest >= 30;
    case "streak-100":
      return ctx.streak.current >= 100 || ctx.streak.longest >= 100;
    case "expenses-50":
      return ctx.expenseCount >= 50;
    case "budget-setter":
      return ctx.budgetCount >= 1;
    case "buddy-chat":
      return ctx.hasChatted;
    default:
      return false;
  }
}

/**
 * Given the set of already-unlocked badge ids, return the ids that are
 * newly earned (and should be celebrated + persisted).
 */
export function checkBadgeUnlocks(
  alreadyUnlocked: ReadonlySet<string>,
  ctx: BadgeContext
): string[] {
  return BADGE_DEFS.filter((b) => !alreadyUnlocked.has(b.id) && unlocked(ctx, b.id)).map(
    (b) => b.id
  );
}

export function badgeDefById(id: string): BadgeDef | undefined {
  return BADGE_DEFS.find((b) => b.id === id);
}
