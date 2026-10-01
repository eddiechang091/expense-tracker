import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useExpenses } from "@/services/expenses/useExpenses";
import { ExpenseForm } from "./ExpenseForm";

export function AddExpensePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { notify } = useToast();
  const { createExpense } = useExpenses();
  const [saving, setSaving] = useState(false);

  return (
    <>
      <PageHeader title="Add expense" lede="Quick capture." />
      <Card>
        <ExpenseForm
          submitLabel="Save expense"
          saving={saving}
          onCancel={() => onNavigate("/expenses")}
          onSubmit={async (values) => {
            setSaving(true);
            try {
              await createExpense({
                amount: values.amount,
                currency: values.currency,
                categoryId: values.categoryId,
                description: values.description,
                date: values.date,
                paymentMethod: values.paymentMethod || undefined,
                notes: values.notes || undefined,
              });
              notify("Added! \uD83C\uDF89");
              onNavigate("/expenses");
            } finally {
              setSaving(false);
            }
          }}
        />
      </Card>
    </>
  );
}
