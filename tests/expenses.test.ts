import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KvStore } from "@/services/anna/storage";
import { createExpenseRepository, ExpenseStoreError } from "@/services/expenses/repository";
import { resetExpenseMutationChain } from "@/services/expenses/store";

function memoryStore(initial: Record<string, unknown> = {}): KvStore & { data: Map<string, string> } {
  const data = new Map<string, string>(
    Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)])
  );
  return {
    kind: "local",
    data,
    async get<T>(key: string): Promise<T | null> {
      const namespaced = `expense-tracker:${key}`;
      const raw = data.get(namespaced);
      if (raw === undefined) return null;
      return JSON.parse(raw) as T;
    },
    async set<T>(key: string, value: T): Promise<void> {
      data.set(`expense-tracker:${key}`, JSON.stringify(value));
    },
    async remove(key: string): Promise<void> {
      data.delete(`expense-tracker:${key}`);
    },
    async keys(): Promise<string[]> {
      return [];
    },
  };
}

describe("expense repository", () => {
  beforeEach(() => {
    resetExpenseMutationChain();
  });

  it("creates, reads, edits, and deletes an expense", async () => {
    const repo = createExpenseRepository(memoryStore());
    const created = await repo.create({
      amount: 12.5,
      currency: "CAD",
      categoryId: "food",
      description: "Lunch",
      date: "2026-09-15",
      paymentMethod: "Card",
      notes: "",
    });
    expect(created.id).toBeTruthy();

    const listed = await repo.list();
    expect(listed).toHaveLength(1);

    const updated = await repo.update(created.id, { amount: 15, description: "Big lunch" });
    expect(updated.amount).toBe(15);
    expect(updated.description).toBe("Big lunch");

    await repo.remove(created.id);
    expect(await repo.list()).toHaveLength(0);
  });

  it("versions stored objects and namespaces keys", async () => {
    const store = memoryStore();
    const repo = createExpenseRepository(store);
    const created = await repo.create({
      amount: 9,
      currency: "CAD",
      categoryId: "fun",
      description: "Arcade",
      date: "2026-09-16",
      paymentMethod: "Cash",
      notes: "",
    });
    const itemRaw = store.data.get(`expense-tracker:expenses:item:${created.id}`);
    expect(itemRaw).toBeTruthy();
    expect((JSON.parse(itemRaw as string) as { version: number }).version).toBe(1);
    const indexRaw = store.data.get("expense-tracker:expenses:index");
    expect((JSON.parse(indexRaw as string) as { version: number; ids: string[] }).ids).toContain(created.id);
  });

  it("persists across repository instances (save then reload)", async () => {
    const store = memoryStore();
    const first = createExpenseRepository(store);
    const created = await first.create({
      amount: 42,
      currency: "CAD",
      categoryId: "bills",
      description: "Power",
      date: "2026-09-10",
      paymentMethod: "Transfer",
      notes: "",
    });
    const second = createExpenseRepository(store);
    const reloaded = await second.get(created.id);
    expect(reloaded?.amount).toBe(42);
    expect(await second.list()).toHaveLength(1);
  });

  it("heals stale index entries", async () => {
    const store = memoryStore({
      "expense-tracker:expenses:index": { version: 1, ids: ["ghost-id"] },
    });
    const repo = createExpenseRepository(store);
    expect(await repo.list()).toHaveLength(0);
    const indexRaw = store.data.get("expense-tracker:expenses:index");
    expect((JSON.parse(indexRaw as string) as { ids: string[] }).ids).toEqual([]);
  });

  it("throws not-found for missing records", async () => {
    const repo = createExpenseRepository(memoryStore());
    await expect(repo.update("nope", { amount: 5 })).rejects.toMatchObject({ code: "not-found" });
    await expect(repo.remove("nope")).rejects.toMatchObject({ code: "not-found" });
  });

  it("surfaces storage failures without crashing the list", async () => {
    const failing: KvStore = {
      kind: "local",
      async get(): Promise<null> {
        throw new Error("boom");
      },
      async set(): Promise<void> {
        throw new Error("boom");
      },
      async remove(): Promise<void> {
        throw new Error("boom");
      },
      async keys(): Promise<string[]> {
        return [];
      },
    };
    const repo = createExpenseRepository(failing);
    await expect(repo.create({
      amount: 5, currency: "CAD", categoryId: null, description: "", date: "2026-09-15",
    })).rejects.toBeInstanceOf(ExpenseStoreError);
    await expect(repo.list()).rejects.toBeInstanceOf(ExpenseStoreError);
  });

  it("serializes concurrent creates so none are lost", async () => {
    const store = memoryStore();
    const repo = createExpenseRepository(store);
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        repo.create({
          amount: n,
          currency: "CAD",
          categoryId: "other",
          description: `Item ${n}`,
          date: "2026-09-15",
          paymentMethod: "Card",
          notes: "",
        })
      )
    );
    expect(results).toHaveLength(5);
    expect(await repo.list()).toHaveLength(5);
  });

  it("rejects oversized payloads before writing", async () => {
    const store = memoryStore();
    const spy = vi.spyOn(store, "set");
    const repo = createExpenseRepository(store);
    await expect(
      repo.create({
        amount: 5,
        currency: "CAD",
        categoryId: null,
        description: "",
        date: "2026-09-15",
        paymentMethod: "Card",
        notes: "x".repeat(300_000),
      })
    ).rejects.toMatchObject({ code: "too-large" });
    expect(spy).not.toHaveBeenCalled();
  });
});
