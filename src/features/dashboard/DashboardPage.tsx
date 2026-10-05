import { lazy, Suspense, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BudgetProgress } from "@/components/ui/BudgetProgress";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { useExpenses } from "@/services/expenses/useExpenses";
import { useBudgets } from "@/services/budgets/useBudgets";
import {
  calculateBudgetProgress,
  comparePeriods,
  currentMonthKey,
  dailyTotals,
  detectMeaningfulChanges,
  filterByMonth,
  sumExpenses,
  totalsByCategory,
} from "@/lib/analytics";
import { money, formatMonthLabel } from "@/lib/utils";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { sortExpensesByRecency } from "@/lib/categories";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { RecentExpenses } from "./RecentExpenses";
import { SpendingChanges } from "./SpendingChanges";
import { MoneyBuddyLuckyCat } from "./MoneyBuddyLuckyCat";
import { useInsight } from "@/features/ai/useInsight";

const SpendingChart = lazy(() => import("@/components/ui/SpendingChart"));

function periodText(delta: number, direction: string, currency: string): string {
  const amount = money(Math.abs(delta), currency);
  if (direction === "flat") return "About the same as last month.";
  if (direction === "down") return `${amount} less than last month 🎉`;
  return `${amount} more than last month.`;
}

function budgetSummaryText(spent: number, limit: number, currency: string): string {
  if (limit <= 0) return "";
  const info = calculateBudgetProgress(spent, limit);
  if (info.status === "over") {
    return `You're ${money(spent - limit, currency)} over budget this month.`;
  }
  if (info.status === "watch") {
    return `Getting close — ${money(info.remaining, currency)} left.`;
  }
  return `You're ${money(info.remaining, currency)} under budget. `;
}

export function DashboardPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { status: expStatus, expenses } = useExpenses();
  const { status: budgetStatus, monthlyBudget, budgets } = useBudgets();
  const isLoading = expStatus === "loading" || budgetStatus === "loading";

  const now = currentMonthKey();
  const currency = expenses[0]?.currency ?? DEFAULT_CURRENCY;

  const monthExpenses = filterByMonth(expenses, now);
  const monthTotal = sumExpenses(monthExpenses);
  const comparison = comparePeriods(expenses, now);
  const catTotals = totalsByCategory(monthExpenses);
  const chartData = dailyTotals(monthExpenses, now);
  const previousMonthExpenses = comparison ? filterByMonth(expenses, comparison.previousKey) : [];
  const changes = detectMeaningfulChanges(monthExpenses, previousMonthExpenses, { maxResults: 3 });

  // AI insight — triggered by the most recently added expense.
  // Memoize by ID to avoid re-firing on every render when the same expense
  // is returned as a new object reference (e.g. after expenses array refresh).
  const recentExpenses = sortExpensesByRecency(monthExpenses).slice(0, 4);
  const latestExpenseRef = sortExpensesByRecency(monthExpenses)[0] ?? null;
  const latestExpense = useMemo(
    () => latestExpenseRef,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [latestExpenseRef?.id]
  );
  const insight = useInsight(latestExpense, expenses, budgets);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Dashboard" lede="How is your money doing?" />
        <Card>
          <LoadingState label="Loading your spending…" />
        </Card>
      </>
    );
  }

  const monthLabel = formatMonthLabel(now);
  const prevLabel = comparison ? formatMonthLabel(comparison.previousKey) : "";

  return (
    <>
      <PageHeader title="Dashboard" lede={`${monthLabel}`} />

      {/* Hero: monthly total + budget progress */}
      <Card>
        {monthExpenses.length === 0 ? (
          <EmptyState
            emoji="🌱"
            title="No expenses yet this month"
            action={
              <Button onClick={() => onNavigate("/add-expense")}>Add your first expense</Button>
            }
          >
            Your money story starts here.
          </EmptyState>
        ) : (
          <div className="dashboard-hero">
            <p className="dashboard-label muted">Total spending</p>
            <p className="dashboard-total">{money(monthTotal, currency)}</p>
            {comparison && comparison.previousTotal > 0 ? (
              <p className="dashboard-comparison muted">
                {periodText(comparison.delta, comparison.direction, currency)}
                {prevLabel ? ` (vs ${prevLabel})` : ""}
              </p>
            ) : null}
            {monthlyBudget ? (
              <div style={{ marginTop: 14 }}>
                <BudgetProgress spent={monthTotal} limit={monthlyBudget.amount} currency={currency} />
                <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {budgetSummaryText(monthTotal, monthlyBudget.amount, currency)}
                </p>
              </div>
            ) : null}
            <div className="row" style={{ marginTop: 14 }}>
              <Button variant="secondary" size="sm" onClick={() => onNavigate("/add-expense")}>
                Add expense
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onNavigate("/expenses")}>
                View all
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Category breakdown */}
      {catTotals.length > 0 ? (
        <Card title="Where it went">
          <CategoryBreakdown totals={catTotals} monthTotal={monthTotal} currency={currency} />
        </Card>
      ) : null}

      {/* Spending changes vs previous month */}
      {changes.length > 0 ? (
        <Card title="What changed">
          <SpendingChanges changes={changes} currency={currency} />
        </Card>
      ) : null}

      {/* Daily spending chart (lazy) */}
      {monthExpenses.length > 0 ? (
        <Card title="Daily spending">
          <Suspense fallback={<LoadingState label="Loading chart…" />}>
            <SpendingChart data={chartData} currency={currency} />
          </Suspense>
        </Card>
      ) : null}

      {/* Recent expenses */}
      {recentExpenses.length > 0 ? (
        <Card title="Recent">
          <RecentExpenses expenses={recentExpenses} onNavigate={onNavigate} />
        </Card>
      ) : null}

      {/* Money Buddy Lucky Cat — tap to hear the AI spending summary */}
      {monthExpenses.length > 0 ? (
        <MoneyBuddyLuckyCat
          insightResult={
            insight.status === "ready" ? (insight.result ?? null) : null
          }
        />
      ) : null}

      {/* Prompt to set a budget if none exists */}
      {!monthlyBudget && monthExpenses.length > 0 ? (
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <p className="muted" style={{ fontSize: 14 }}>No monthly budget set yet.</p>
            <Button variant="secondary" size="sm" onClick={() => onNavigate("/budgets")}>
              Set a budget
            </Button>
          </div>
        </Card>
      ) : null}
    </>
  );
}
