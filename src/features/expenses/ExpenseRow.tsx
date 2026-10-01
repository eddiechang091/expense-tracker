import { useState } from "react";
import type { Expense } from "@/lib/types";
import { getCategoryById } from "@/lib/categories";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExpenseForm, type ExpenseFormValues } from "./ExpenseForm";

function formatDateLabel(iso: string): string {
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3) return iso;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function ExpenseRow({
  expense,
  pending,
  editing,
  deleting,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  expense: Expense;
  pending: boolean;
  editing: boolean;
  deleting: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (values: ExpenseFormValues) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const category = getCategoryById(expense.categoryId);
  const title = expense.description || category?.name || "Expense";

  if (editing) {
    return (
      <Card className="expense-wrap">
        <ExpenseForm
          initial={{
            amount: expense.amount,
            currency: expense.currency,
            categoryId: expense.categoryId ?? "",
            description: expense.description,
            date: expense.date,
            paymentMethod: expense.paymentMethod ?? "Card",
            notes: expense.notes ?? "",
          }}
          submitLabel="Save changes"
          saving={savingEdit}
          onCancel={onCancelEdit}
          onSubmit={async (values) => {
            setSavingEdit(true);
            try {
              await onSaveEdit(values);
            } finally {
              setSavingEdit(false);
            }
          }}
        />
      </Card>
    );
  }

  return (
    <Card className="expense-wrap">
      <article className={pending ? "expense-card is-pending" : "expense-card"} aria-label={title}>
        <div className="expense-main">
          <div className="expense-title-row">
            <span className="expense-title">{title}</span>
            {pending ? <span className="saving-pill">Saving…</span> : null}
          </div>
          <div className="expense-meta">
            <CategoryChip category={category} />
            <span className="muted">{formatDateLabel(expense.date)}</span>
            {expense.paymentMethod ? <span className="muted">{expense.paymentMethod}</span> : null}
          </div>
        </div>
        <div className="expense-side">
          <span className="expense-amount">{money(expense.amount, expense.currency)}</span>
          <div className="row expense-actions">
            <Button type="button" variant="ghost" size="sm" onClick={onEdit} disabled={deleting}>
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          title="Delete this expense?"
          body={`${title} · ${money(expense.amount, expense.currency)}. This cannot be undone.`}
          confirmLabel={deleting ? "Deleting…" : "Delete"}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={async () => {
            await onDelete();
            setConfirmOpen(false);
          }}
        />
      </article>
    </Card>
  );
}
