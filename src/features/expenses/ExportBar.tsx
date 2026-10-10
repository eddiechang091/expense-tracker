import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import type { Expense, MonthlyBudget } from "@/lib/types";
import { currentMonthKey, filterByMonth, monthKeyOfIsoDate } from "@/lib/analytics";
import { exportExpensesExcel } from "@/services/export/excel";
import { exportMonthlyStatement } from "@/services/export/pdf";
import { useProfile } from "@/services/profile/useProfile";
import { useTheme } from "@/services/theme/useTheme";

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en", { month: "long", year: "numeric" });
}

/** Distinct months present in the data, newest first. */
function availableMonths(expenses: Expense[]): string[] {
  const set = new Set<string>();
  for (const e of expenses) {
    const k = monthKeyOfIsoDate(e.date);
    if (k) set.add(k);
  }
  const cur = currentMonthKey();
  set.add(cur);
  return [...set].sort().reverse();
}

export function ExportBar({ expenses, budgets }: { expenses: Expense[]; budgets: MonthlyBudget[] }) {
  const { notify } = useToast();
  const { profile } = useProfile();
  const { theme } = useTheme();
  const months = availableMonths(expenses);
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const currency = profile.currency ?? "USD";

  const monthExpenses = filterByMonth(expenses, monthKey);

  function handleExcel() {
    if (monthExpenses.length === 0) {
      notify("No expenses in this month to export.", "error");
      return;
    }
    exportExpensesExcel({ expenses: monthExpenses, monthKey, currency });
    notify("Excel downloaded.");
  }

  function handlePdf() {
    if (monthExpenses.length === 0) {
      notify("No expenses in this month to export.", "error");
      return;
    }
    exportMonthlyStatement({
      expenses: monthExpenses,
      budgets,
      monthKey,
      monthLabel: monthLabel(monthKey),
      currency,
      theme,
    });
    notify("PDF statement downloaded.");
  }

  return (
    <Card title="Export">
      <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <select
          value={monthKey}
          onChange={(e) => setMonthKey(e.target.value)}
          className="input"
          style={{ maxWidth: 200 }}
          aria-label="Month to export"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" size="sm" onClick={handleExcel}>
          Excel
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={handlePdf}>
          PDF statement
        </Button>
        <span className="muted" style={{ fontSize: 12 }}>
          {monthExpenses.length} expense{monthExpenses.length === 1 ? "" : "s"}
        </span>
      </div>
    </Card>
  );
}
