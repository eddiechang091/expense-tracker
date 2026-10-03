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

export function buildSuggestedQuestions(
  ctx: ConversationContext,
  hasMessages: boolean
): string[] {
  if (!hasMessages) return [...WELCOME_SUGGESTIONS];

  const suggestions: string[] = [];

  // Category-specific suggestions from the active expense
  const catId = ctx.currentExpense?.categoryId ?? null;
  if (catId && CATEGORY_SUGGESTIONS[catId]) {
    suggestions.push(...CATEGORY_SUGGESTIONS[catId]);
  }

  // Budget-based suggestions
  const budgetStatus = ctx.financialSummary.budget?.status;
  if (budgetStatus === "over" || budgetStatus === "watch") {
    suggestions.push(...BUDGET_QUESTIONS);
  }

  // Pattern suggestions when meaningful changes exist
  if (ctx.financialSummary.changes.length > 0) {
    suggestions.push(...PATTERN_QUESTIONS);
  }

  // If nothing specific, use generic suggestions
  if (suggestions.length === 0) {
    suggestions.push(
      "How am I doing this month?",
      "What am I spending the most on?",
      "Am I on track with my budget?"
    );
  }

  // Deduplicate and cap at 4
  return [...new Set(suggestions)].slice(0, 4);
}
