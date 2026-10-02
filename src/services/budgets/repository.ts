import type { KvStore } from "@/services/anna/storage";
import { getKvStore } from "@/services/anna/storage";
import { DEFAULT_CURRENCY, STORAGE_KEYS } from "@/lib/constants";
import { newId } from "@/lib/utils";
import { normalizeCategoryId } from "@/lib/categories";
import type { MonthlyBudget } from "@/lib/types";
import { assertStorable, serializeMutation } from "@/services/expenses/store";
import {
  BudgetStoreError,
  budgetNotFoundError,
  budgetStorageError,
  sanitizeBudgetAmount,
  unwrapBudgetDoc,
  wrapBudgetDoc,
  type BudgetInput,
} from "./store";

export { BudgetStoreError };
export type { BudgetInput };

export interface BudgetRepository {
  list(): Promise<MonthlyBudget[]>;
  upsert(input: BudgetInput): Promise<MonthlyBudget>;
  remove(id: string): Promise<void>;
}

async function readBudgetIds(store: KvStore): Promise<string[]> {
  let doc: unknown;
  try {
    doc = await store.get<{ version: number; ids: unknown }>(STORAGE_KEYS.budgetsIndex);
  } catch {
    throw budgetStorageError();
  }
  if (!doc || typeof doc !== "object") return [];
  const ids = (doc as { ids: unknown }).ids;
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === "string" && id.length > 0);
}

async function writeBudgetIds(store: KvStore, ids: string[]): Promise<void> {
  const doc = { version: 1, ids };
  assertStorable(doc, "budgets index");
  try {
    await store.set(STORAGE_KEYS.budgetsIndex, doc);
  } catch (error) {
    if (error instanceof BudgetStoreError) throw error;
    throw budgetStorageError();
  }
}

function budgetKey(id: string): string {
  return `budgets:item:${id}`;
}

export function createBudgetRepository(store: KvStore): BudgetRepository {
  return {
    async list(): Promise<MonthlyBudget[]> {
      const ids = await readBudgetIds(store);
      if (ids.length === 0) return [];
      const settled = await Promise.all(
        ids.map(async (id) => {
          try {
            const doc = await store.get<unknown>(budgetKey(id));
            return unwrapBudgetDoc(doc);
          } catch {
            return null;
          }
        })
      );
      return settled.filter((budget): budget is MonthlyBudget => budget !== null);
    },

    async upsert(input: BudgetInput): Promise<MonthlyBudget> {
      const amount = sanitizeBudgetAmount(input.amount);
      const categoryId = normalizeCategoryId(input.categoryId);
      const currency = (input.currency || DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY;
      return serializeMutation(async () => {
        const existing = await this.list();
        const match = existing.find((budget) => budget.categoryId === categoryId) ?? null;
        const now = new Date().toISOString();
        const budget: MonthlyBudget = {
          id: match?.id ?? newId(),
          categoryId,
          amount,
          currency,
          period: "monthly",
          createdAt: match?.createdAt ?? now,
          updatedAt: now,
        };
        const doc = wrapBudgetDoc(budget);
        assertStorable(doc, "budget");
        try {
          await store.set(budgetKey(budget.id), doc);
        } catch (error) {
          if (error instanceof BudgetStoreError) throw error;
          throw budgetStorageError();
        }
        try {
          const ids = await readBudgetIds(store);
          if (!ids.includes(budget.id)) ids.push(budget.id);
          await writeBudgetIds(store, ids);
        } catch (error) {
          await store.remove(budgetKey(budget.id)).catch(() => undefined);
          if (error instanceof BudgetStoreError) throw error;
          throw budgetStorageError();
        }
        return budget;
      });
    },

    async remove(id: string): Promise<void> {
      return serializeMutation(async () => {
        let doc: unknown;
        try {
          doc = await store.get<unknown>(budgetKey(id));
        } catch {
          throw budgetStorageError();
        }
        if (!unwrapBudgetDoc(doc)) throw budgetNotFoundError();
        try {
          await store.remove(budgetKey(id));
        } catch {
          throw budgetStorageError();
        }
        try {
          const ids = await readBudgetIds(store);
          const cleaned = ids.filter((entry) => entry !== id);
          if (cleaned.length !== ids.length) await writeBudgetIds(store, cleaned);
        } catch {
          console.warn("[budgets] index cleanup deferred; list() tolerates stale ids.");
        }
      });
    },
  };
}

let cached: Promise<BudgetRepository> | null = null;

export function getBudgetRepository(): Promise<BudgetRepository> {
  if (cached) return cached;
  cached = getKvStore().then((store) => createBudgetRepository(store));
  return cached;
}

export function resetBudgetRepository(): void {
  cached = null;
}
