import { useState, useEffect } from "react";
import type { Expense, MonthlyBudget } from "@/lib/types";
import type { InsightResult } from "@/lib/aiSchema";
import { getLlmService } from "@/services/anna/llm";
import { createInsightService } from "./insight";

export type InsightStatus = "idle" | "loading" | "ready" | "unavailable" | "error";

export interface InsightState {
  status: InsightStatus;
  result: InsightResult | null;
}

export function useInsight(
  expense: Expense | null,
  allExpenses: Expense[],
  budgets: MonthlyBudget[]
): InsightState {
  const [state, setState] = useState<InsightState>({ status: "idle", result: null });

  useEffect(() => {
    if (!expense) {
      setState({ status: "idle", result: null });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", result: null });
    (async () => {
      try {
        const llm = await getLlmService();
        if (!llm.available) {
          if (!cancelled) setState({ status: "unavailable", result: null });
          return;
        }
        const service = createInsightService(llm);
        const result = await service.getInsight(expense, allExpenses, budgets);
        if (!cancelled) setState({ status: "ready", result });
      } catch {
        if (!cancelled) setState({ status: "error", result: null });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense?.id]);

  return state;
}
