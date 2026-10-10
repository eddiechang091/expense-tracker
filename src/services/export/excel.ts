import * as XLSX from "xlsx";
import type { Expense } from "@/lib/types";
import { categoryLabel } from "@/lib/categories";

export interface ExcelExportOptions {
  expenses: Expense[];
  /** e.g. "2026-10" — used in the filename. */
  monthKey: string;
  currency: string;
}

/** Export expenses as a .xlsx file and trigger download. */
export function exportExpensesExcel({ expenses, monthKey, currency }: ExcelExportOptions): void {
  const rows = expenses.map((e) => ({
    Date: e.date,
    Description: e.description || categoryLabel(e.categoryId),
    Category: categoryLabel(e.categoryId),
    Amount: e.amount,
    Currency: e.currency,
    "Payment Method": e.paymentMethod ?? "",
    Notes: e.notes ?? "",
    "Original Amount":
      e.originalAmount != null && e.originalCurrency ? `${e.originalAmount} ${e.originalCurrency}` : "",
    "FX Rate": e.fxRate ?? "",
  }));

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const ws = XLSX.utils.json_to_sheet(rows);
  // Totals row
  XLSX.utils.sheet_add_aoa(ws, [[`Total (${expenses.length} expenses)`, "", "", total, currency]], {
    origin: -1,
  });
  ws["!cols"] = [
    { wch: 12 },
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 9 },
    { wch: 14 },
    { wch: 36 },
    { wch: 16 },
    { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");
  XLSX.writeFile(wb, `money-companion-${monthKey}.xlsx`);
}
