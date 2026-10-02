import type { LlmService } from "@/services/anna/llm";
import type { Expense, MonthlyBudget } from "@/lib/types";
import { buildInsightContext } from "@/lib/aiContext";
import { parseInsightResponse, type InsightResult } from "@/lib/aiSchema";
import { buildInsightMessages, buildRepairMessages } from "./prompts";
import { buildFallbackResponse } from "./fallback";

const INSIGHT_MAX_TOKENS = 600;
const REPAIR_MAX_TOKENS = 500;
const TEMPERATURE = 0.8;

export interface InsightService {
  getInsight(
    expense: Expense,
    allExpenses: Expense[],
    budgets: MonthlyBudget[]
  ): Promise<InsightResult>;
}

export function createInsightService(llm: LlmService): InsightService {
  return {
    async getInsight(expense, allExpenses, budgets): Promise<InsightResult> {
      const ctx = buildInsightContext(expense, allExpenses, budgets);
      const messages = buildInsightMessages(ctx);

      // Attempt 1
      let rawText = "";
      try {
        const result = await llm.complete({
          messages,
          maxTokens: INSIGHT_MAX_TOKENS,
          temperature: TEMPERATURE,
          json: true,
        });
        rawText = result.text;
      } catch {
        return buildFallbackResponse(expense, ctx);
      }

      const parsed = parseInsightResponse(rawText);
      if (parsed) return { ...parsed, isFallback: false };

      // Repair attempt
      const repairMessages = buildRepairMessages(messages, rawText);
      try {
        const repairResult = await llm.complete({
          messages: repairMessages,
          maxTokens: REPAIR_MAX_TOKENS,
          temperature: 0.3,
          json: true,
        });
        const repaired = parseInsightResponse(repairResult.text);
        if (repaired) return { ...repaired, isFallback: false };
      } catch {
        // fall through to fallback
      }

      return buildFallbackResponse(expense, ctx);
    },
  };
}
