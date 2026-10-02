import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useBudgets } from "@/services/budgets/useBudgets";
import { useExpenses } from "@/services/expenses/useExpenses";
import { filterByMonth, sumExpenses, totalsByCategory, currentMonthKey } from "@/lib/analytics";
import { BudgetForm } from "./BudgetForm";
import { BudgetRow } from "./BudgetRow";
import { useToast } from "@/components/ui/Toast";

export function BudgetsPage() {
  const { status: budgetStatus, budgets, monthlyBudget, categoryBudgets, error, saveBudget, deleteBudget, refresh } = useBudgets();
  const { expenses } = useExpenses();
  const { notify } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const now = currentMonthKey();
  const monthExpenses = filterByMonth(expenses, now);
  const monthTotal = sumExpenses(monthExpenses);
  const catTotals = totalsByCategory(monthExpenses);

  function spentForBudget(categoryId: string | null): number {
    if (categoryId === null) return monthTotal;
    const row = catTotals.find((t) => t.categoryId === categoryId);
    return row?.total ?? 0;
  }

  if (budgetStatus === "loading") {
    return (
      <>
        <PageHeader title="Budgets" lede="Simple monthly limits." />
        <Card>
          <LoadingState label="Loading your budgets…" />
        </Card>
      </>
    );
  }

  if (budgetStatus === "error") {
    return (
      <>
        <PageHeader title="Budgets" lede="Simple monthly limits." />
        <Card>
          <ErrorState
            action={<Button onClick={() => void refresh()}>Try again</Button>}
          >
            {error ?? "Couldn't load your budgets."}
          </ErrorState>
        </Card>
      </>
    );
  }

  const allBudgets = monthlyBudget
    ? [monthlyBudget, ...categoryBudgets]
    : categoryBudgets;

  return (
    <>
      <PageHeader
        title="Budgets"
        lede="Simple monthly limits that stay out of your way."
        actions={
          !showForm ? (
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              Add budget
            </Button>
          ) : null
        }
      />

      {showForm ? (
        <Card title="New budget">
          <BudgetForm
            existingBudgets={budgets}
            saving={saving}
            onCancel={() => setShowForm(false)}
            onSubmit={async (input) => {
              setSaving(true);
              try {
                await saveBudget(input);
                notify("Budget saved! 🐷");
                setShowForm(false);
              } finally {
                setSaving(false);
              }
            }}
          />
        </Card>
      ) : null}

      {allBudgets.length === 0 && !showForm ? (
        <Card>
          <EmptyState
            emoji="🐷"
            title="No budgets yet"
            action={<Button onClick={() => setShowForm(true)}>Set your first budget</Button>}
          >
            A monthly limit helps you see when things add up faster than expected.
          </EmptyState>
        </Card>
      ) : (
        allBudgets.map((budget) => (
          <Card key={budget.id}>
            <BudgetRow
              budget={budget}
              spent={spentForBudget(budget.categoryId)}
              onSave={async (input) => {
                await saveBudget(input);
                notify("Budget updated!");
              }}
              onDelete={async () => {
                await deleteBudget(budget.id);
                notify("Budget removed.");
              }}
            />
          </Card>
        ))
      )}
    </>
  );
}
