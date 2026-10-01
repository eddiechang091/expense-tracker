import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { useExpenses } from "@/services/expenses/useExpenses";
import { ExpenseList } from "./ExpenseList";

export function ExpensesPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { status, expenses, error, refresh, deleteExpense, isPending } = useExpenses();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Expenses"
        lede="Everything you have tracked."
        actions={
          <Button variant="secondary" size="sm" onClick={() => onNavigate("/add-expense")}>
            Add expense
          </Button>
        }
      />
      <ExpenseList
        status={status}
        expenses={expenses}
        error={error}
        onRetry={() => void refresh()}
        editingId={editingId}
        onEdit={(expense) => setEditingId(expense.id)}
        onCancelEdit={() => setEditingId(null)}
        onDelete={async (expense) => {
          setDeletingId(expense.id);
          try {
            await deleteExpense(expense.id);
          } finally {
            setDeletingId(null);
          }
        }}
        deletingId={deletingId}
        isPending={isPending}
        onAddFirst={() => onNavigate("/add-expense")}
      />
    </>
  );
}
