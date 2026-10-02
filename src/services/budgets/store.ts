import type { MonthlyBudget } from "@/lib/types";
import { STORAGE_VERSION } from "@/lib/constants";

export type BudgetStoreErrorCode = "not-found" | "storage" | "too-large";

export class BudgetStoreError extends Error {
  readonly code: BudgetStoreErrorCode;

  constructor(code: BudgetStoreErrorCode, message: string) {
    super(message);
    this.name = "BudgetStoreError";
    this.code = code;
  }
}

export function budgetStorageError(): BudgetStoreError {
  return new BudgetStoreError("storage", "Couldn't reach your budget storage. Please try again.");
}

export function budgetNotFoundError(): BudgetStoreError {
  return new BudgetStoreError("not-found", "That budget is already gone.");
}

export interface BudgetInput {
  categoryId: string | null;
  amount: number;
  currency?: string;
}

export function isBudgetRecord(value: unknown): value is MonthlyBudget {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    (record.categoryId === null || typeof record.categoryId === "string") &&
    typeof record.amount === "number" &&
    Number.isFinite(record.amount) &&
    record.amount >= 0 &&
    typeof record.currency === "string" &&
    record.period === "monthly" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

export function sanitizeBudgetAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BudgetStoreError("storage", "Pick an amount above zero for your budget.");
  }
  return Math.round(amount * 100) / 100;
}

export function wrapBudgetDoc(budget: MonthlyBudget): { version: number; budget: MonthlyBudget } {
  return { version: STORAGE_VERSION, budget };
}

export function unwrapBudgetDoc(doc: unknown): MonthlyBudget | null {
  if (!doc || typeof doc !== "object") return null;
  const budget = (doc as { budget: unknown }).budget;
  return isBudgetRecord(budget) ? budget : null;
}
