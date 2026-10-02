import type { Category } from "./types";

export const APP_NAMESPACE = "expense-tracker";
export const STORAGE_VERSION = 1;
export const DEFAULT_CURRENCY = "CAD";

export const STORAGE_KEYS = {
  profile: "profile",
  expensesIndex: "expenses:index",
  expense: (id: string) => `expenses:item:${id}`,
  categoriesIndex: "categories:index",
  budgetsIndex: "budgets:index",
  budget: (id: string) => `budgets:item:${id}`,
} as const;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "food", name: "Food", icon: "\uD83C\uDF5C", color: "#ff8a5b", isDefault: true },
  { id: "transport", name: "Transport", icon: "\uD83D\uDE97", color: "#5b9bff", isDefault: true },
  { id: "shopping", name: "Shopping", icon: "\uD83D\uDECD", color: "#c17bff", isDefault: true },
  { id: "bills", name: "Bills", icon: "\uD83C\uDFE0", color: "#4fc3a1", isDefault: true },
  { id: "fun", name: "Fun", icon: "\uD83C\uDFAE", color: "#f5b642", isDefault: true },
  { id: "health", name: "Health", icon: "\uD83D\uDC8A", color: "#ff7aa8", isDefault: true },
  { id: "other", name: "Other", icon: "\uD83D\uDCE6", color: "#9aa3b2", isDefault: true },
];