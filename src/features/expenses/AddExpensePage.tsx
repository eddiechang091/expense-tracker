import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useExpenses } from "@/services/expenses/useExpenses";
import { useProfile } from "@/services/profile/useProfile";
import { getRateInfo, fxNote } from "@/services/fx/rates";
import { money } from "@/lib/utils";
import { ExpenseForm } from "./ExpenseForm";

export function AddExpensePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { notify } = useToast();
  const { createExpense } = useExpenses();
  const { profile } = useProfile();
  const defaultCurrency = profile.currency || "USD";
  const [saving, setSaving] = useState(false);

  return (
    <>
      <PageHeader title="Add expense" lede="Quick capture." />
      <Card>
        <ExpenseForm
          submitLabel="Save expense"
          saving={saving}
          defaultCurrency={defaultCurrency}
          onCancel={() => onNavigate("/expenses")}
          onSubmit={async (values) => {
            setSaving(true);
            try {
              let amount = values.amount;
              let currency = values.currency.toUpperCase();
              let originalAmount: number | undefined;
              let originalCurrency: string | undefined;
              let fxRate: number | undefined;
              let notes = values.notes || undefined;

              // Convert to default currency when a different currency was chosen
              if (currency !== defaultCurrency) {
                const info = await getRateInfo(currency, defaultCurrency);
                if (info !== null) {
                  originalAmount = values.amount;
                  originalCurrency = currency;
                  fxRate = info.rate;
                  amount = Math.round(values.amount * info.rate * 100) / 100;
                  currency = defaultCurrency;
                  const note = `${fxNote(originalCurrency, defaultCurrency, info.rate, info.asOf, info.live)} — converted ${money(originalAmount, originalCurrency)} to ${money(amount, defaultCurrency)}`;
                  notes = notes ? `${notes}\n${note}` : note;
                } else {
                  notify("Live rate unavailable — saved in original currency.", "error");
                }
              }

              await createExpense({
                amount,
                currency,
                categoryId: values.categoryId,
                description: values.description,
                date: values.date,
                paymentMethod: values.paymentMethod || undefined,
                notes,
                originalAmount,
                originalCurrency,
                fxRate,
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
