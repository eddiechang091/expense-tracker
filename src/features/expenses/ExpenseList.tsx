import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import type { Expense } from "@/lib/types";
import { useExpenses } from "@/services/expenses/useExpenses";
import { ExpenseRow } from "./ExpenseRow";

export function ExpenseList({
  status,
  expenses,
  error,
  onRetry,
  editingId,
  onEdit,
  onCancelEdit,
  onDelete,
  deletingId,
  isPending,
  onAddFirst,
}: {
  status: "loading" | "ready" | "error";
  expenses: Expense[];
  error: string | null;
  onRetry: () => void;
  editingId: string | null;
  onEdit: (expense: Expense) => void;
  onCancelEdit: () => void;
  onDelete: (expense: Expense) => Promise<void>;
  deletingId: string | null;
  isPending: (id: string) => boolean;
  onAddFirst: () => void;
}) {
  const { updateExpense } = useExpenses();
  const { notify } = useToast();

  if (status === "loading") {
    return (
      <Card>
        <LoadingState label="Loading your expenses…" />
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <ErrorState action={<Button onClick={onRetry}>Try again</Button>}>{error}</ErrorState>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <EmptyState
          emoji={"\uD83E\uDDFE"}
          title="No expenses yet"
          action={<Button onClick={onAddFirst}>Add your first expense</Button>}
        >
          Add your first expense and your money story will start taking shape.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="stack" role="list" aria-label="Expenses">
      {expenses.map((expense) => (
        <div key={expense.id} role="listitem" className="expense-item">
          <ExpenseRow
            expense={expense}
            pending={isPending(expense.id)}
            editing={editingId === expense.id}
            deleting={deletingId === expense.id}
            onEdit={() => onEdit(expense)}
            onCancelEdit={onCancelEdit}
            onSaveEdit={async (values) => {
              await updateExpense(expense.id, {
                amount: values.amount,
                currency: values.currency,
                categoryId: values.categoryId,
                description: values.description,
                date: values.date,
                paymentMethod: values.paymentMethod || undefined,
                notes: values.notes || undefined,
              });
              notify("Saved!");
              onCancelEdit();
            }}
            onDelete={() => onDelete(expense)}
          />
        </div>
      ))}
    </div>
  );
}
