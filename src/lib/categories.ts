import { DEFAULT_CATEGORIES } from "./constants";
import type { Category, Expense } from "./types";

export function getCategoryById(id: string | null | undefined): Category | null {
  if (!id) return null;
  return DEFAULT_CATEGORIES.find((category) => category.id === id) ?? null;
}

export function normalizeCategoryId(id: unknown): string | null {
  if (typeof id !== "string" || id.trim() === "") return null;
  return DEFAULT_CATEGORIES.some((category) => category.id === id) ? id : null;
}

export function categoryLabel(id: string | null | undefined): string {
  return getCategoryById(id)?.name ?? "Uncategorized";
}

export function sortExpensesByRecency(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
}
