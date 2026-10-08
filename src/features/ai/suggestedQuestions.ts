import type { ConversationContext } from "./conversationContext";

type SuggestionSet = readonly string[];

const WELCOME_SUGGESTIONS: SuggestionSet = [
  "How am I doing this month?",
  "What am I spending the most on?",
  "Am I on track with my budget?",
];

const CATEGORY_SUGGESTIONS: Record<string, SuggestionSet> = {
  food: [
    "Was it worth it?",
    "How much have I spent eating out?",
    "Am I eating out more than usual?",
  ],
  transport: [
    "How much am I spending on transport?",
    "Is this my usual amount?",
    "Am I spending more on transport than last month?",
  ],
  shopping: [
    "Was this planned?",
    "How much have I spent shopping this month?",
    "Can I keep spending this month?",
  ],
  bills: [
    "Am I on track with bills this month?",
    "Are my bills going up?",
    "What fixed costs do I have?",
  ],
  fun: [
    "How much fun spending am I doing?",
    "Is this my usual amount?",
    "How does this compare to last month?",
  ],
  health: [
    "What's my health spending like?",
    "Is this a regular expense?",
    "How much have I spent on health?",
  ],
  other: [
    "What's this expense about?",
    "How much have I spent in this category?",
    "Is this a one-time expense?",
  ],
};

const BUDGET_QUESTIONS: SuggestionSet = [
  "How much budget do I have left?",
  "Am I over budget?",
  "How do I get back on track?",
];

const PATTERN_QUESTIONS: SuggestionSet = [
  "What's changed in my spending?",
  "Do I have any recurring expenses?",
  "Which category went up the most?",
];

/** Normalize for comparison: lowercase, strip punctuation. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

/** Check if a candidate was already asked (exact or high word overlap). */
function wasAsked(candidate: string, asked: string[]): boolean {
  const c = norm(candidate);
  const cWords = new Set(c.split(/\s+/).filter((w) => w.length > 3));
  for (const a of asked) {
    const na = norm(a);
    if (na === c) return true;
    // High overlap: >60% of candidate's significant words appear in asked
    if (cWords.size > 0) {
      const overlap = [...cWords].filter((w) => na.includes(w)).length;
      if (overlap / cWords.size > 0.6) return true;
    }
  }
  return false;
}

export function buildSuggestedQuestions(
  ctx: ConversationContext,
  hasMessages: boolean,
  userMessages: string[] = []
): string[] {
  if (!hasMessages) return [...WELCOME_SUGGESTIONS];

  const asked = userMessages.map(norm).filter(Boolean);
  const suggestions: string[] = [];
  const pushIfNew = (q: string) => {
    if (!wasAsked(q, asked) && !suggestions.includes(q)) suggestions.push(q);
  };

  // Category-specific suggestions from the active expense
  const catId = ctx.currentExpense?.categoryId ?? null;
  if (catId && CATEGORY_SUGGESTIONS[catId]) {
    for (const q of CATEGORY_SUGGESTIONS[catId]) pushIfNew(q);
  }

  // Budget-based suggestions
  const budgetStatus = ctx.financialSummary.budget?.status;
  if (budgetStatus === "over" || budgetStatus === "watch") {
    for (const q of BUDGET_QUESTIONS) pushIfNew(q);
  }

  // Pattern suggestions when meaningful changes exist
  if (ctx.financialSummary.changes.length > 0) {
    for (const q of PATTERN_QUESTIONS) pushIfNew(q);
  }

  // Unexplored topics: suggest categories with spending that haven't been discussed
  const discussedCats = new Set<string>();
  for (const m of asked) {
    for (const cat of Object.keys(CATEGORY_SUGGESTIONS)) {
      if (m.includes(cat)) discussedCats.add(cat);
    }
  }
  for (const top of ctx.financialSummary.topCategories.slice(0, 3)) {
    const catId = top.category.toLowerCase();
    if (!discussedCats.has(catId) && CATEGORY_SUGGESTIONS[catId]) {
      for (const q of CATEGORY_SUGGESTIONS[catId].slice(0, 1)) pushIfNew(q);
      if (suggestions.length >= 3) break;
    }
  }

  // If nothing specific (or all asked), use generic unexplored suggestions
  if (suggestions.length === 0) {
    for (const q of [
      "How am I doing this month?",
      "What am I spending the most on?",
      "Am I on track with my budget?",
    ]) {
      pushIfNew(q);
    }
  }

  return suggestions.slice(0, 3);
}
