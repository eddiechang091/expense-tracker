import type { KvStore } from "@/services/anna/storage";
import { getKvStore } from "@/services/anna/storage";
import { DEFAULT_CURRENCY, STORAGE_KEYS } from "@/lib/constants";
import { newId } from "@/lib/utils";
import { normalizeCategoryId } from "@/lib/categories";
import type { MonthlyBudget } from "@/lib/types";
import {
  BudgetStoreError,
  budgetNotFoundError,
  budgetStorageError,
  sanitizeBudgetAmount,
  serializeBudgetMutation,
  assertBudgetStorable,
  readBudgetIndex,
  writeBudgetIndex,
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

export function createBudgetRepository(store: KvStore): BudgetRepository {
  return {
    async list(): Promise<MonthlyBudget[]> {
      const ids = await readBudgetIndex(store);
      if (ids.length === 0) return [];
      const settled = await Promise.all(
        ids.map(async (id) => {
          try {
            const doc = await store.get<unknown>(STORAGE_KEYS.budget(id));
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
      return serializeBudgetMutation(async () => {
        const ids = await readBudgetIndex(store);
        // Find existing budget for this category by reading each record.
        let existing: MonthlyBudget | null = null;
        for (const id of ids) {
          try {
            const doc = await store.get<unknown>(STORAGE_KEYS.budget(id));
            const record = unwrapBudgetDoc(doc);
            if (record && record.categoryId === categoryId) {
              existing = record;
              break;
            }
          } catch {
            continue;
          }
        }
        const now = new Date().toISOString();
        const budget: MonthlyBudget = {
          id: existing?.id ?? newId(),
          categoryId,
          amount,
          currency,
          period: "monthly",
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        const doc = wrapBudgetDoc(budget);
        assertBudgetStorable(doc);
        try {
          await store.set(STORAGE_KEYS.budget(budget.id), doc);
        } catch (error) {
          if (error instanceof BudgetStoreError) throw error;
          throw budgetStorageError();
        }
        try {
          if (!ids.includes(budget.id)) {
            ids.push(budget.id);
            await writeBudgetIndex(store, ids);
          }
        } catch (error) {
          await store.remove(STORAGE_KEYS.budget(budget.id)).catch(() => undefined);
          if (error instanceof BudgetStoreError) throw error;
          throw budgetStorageError();
        }
        return budget;
      });
    },

    async remove(id: string): Promise<void> {
      return serializeBudgetMutation(async () => {
        let doc: unknown;
        try {
          doc = await store.get<unknown>(STORAGE_KEYS.budget(id));
        } catch {
          throw budgetStorageError();
        }
        if (!unwrapBudgetDoc(doc)) throw budgetNotFoundError();
        try {
          await store.remove(STORAGE_KEYS.budget(id));
        } catch {
          throw budgetStorageError();
        }
        try {
          const ids = await readBudgetIndex(store);
          const cleaned = ids.filter((entry) => entry !== id);
          if (cleaned.length !== ids.length) await writeBudgetIndex(store, cleaned);
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
