import type { Expense } from "@/lib/types";
import type { InsightContext } from "@/lib/aiContext";
import type { InsightResult } from "@/lib/aiSchema";
import { getCategoryById } from "@/lib/categories";
import { money } from "@/lib/utils";

function categoryEmoji(categoryId: string | null): string {
  return getCategoryById(categoryId)?.icon ?? "💸";
}

export function buildFallbackResponse(
  expense: Expense,
  context: InsightContext
): InsightResult {
  const cat = getCategoryById(expense.categoryId);
  const catName = cat?.name ?? "expense";
  const emoji = categoryEmoji(expense.categoryId);
  const amount = money(expense.amount, expense.currency);
  const budget = context.financialSummary.budget;

  let headline: string;
  if (expense.amount < 10) {
    headline = `${amount} in ${catName} ${emoji}`;
  } else if (expense.amount < 50) {
    headline = `${amount} in ${catName} — logged! ${emoji}`;
  } else if (expense.amount < 150) {
    headline = `${amount} in ${catName} — a noticeable one. Logged! ${emoji}`;
  } else {
    headline = `${amount} in ${catName} — that's a bigger expense. Logged! ${emoji}`;
  }

  let financialObservation: string | null = null;
  if (budget?.status === "over") {
    financialObservation = "Heads up — the monthly budget is over for now.";
  } else if (budget?.status === "watch") {
    financialObservation = `Budget is at ${budget.pct}% — getting close.`;
  }

  return {
    mode: "casual",
    tone: "warm",
    headline,
    smallTalk: null,
    context: null,
    financialObservation,
    suggestion: null,
    followUpQuestion: null,
    confidence: 1.0,
    isFallback: true,
  };
}
