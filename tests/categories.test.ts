import { describe, expect, it } from "vitest";
import { categoryLabel, getCategoryById, normalizeCategoryId, sortExpensesByRecency } from "@/lib/categories";
import type { Expense } from "@/lib/types";

function makeExpense(partial: Partial<Expense> & { id: string }): Expense {
  return {
    amount: 10,
    currency: "CAD",
    categoryId: "food",
    description: "Test",
    date: "2026-09-15",
    createdAt: "2026-09-15T00:00:00.000Z",
    updatedAt: "2026-09-15T00:00:00.000Z",
    ...partial,
  };
}

describe("categories", () => {
  it("resolves the seven predefined categories", () => {
    for (const id of ["food", "transport", "shopping", "bills", "fun", "health", "other"]) {
      expect(getCategoryById(id)?.id).toBe(id);
    }
  });

  it("normalizes unknown ids to null", () => {
    expect(normalizeCategoryId("yacht")).toBeNull();
    expect(normalizeCategoryId("")).toBeNull();
    expect(normalizeCategoryId(undefined)).toBeNull();
  });

  it("labels unknown categories as uncategorized", () => {
    expect(categoryLabel("yacht")).toBe("Uncategorized");
    expect(categoryLabel(null)).toBe("Uncategorized");
  });
});

describe("sortExpensesByRecency", () => {
  it("orders newest date first", () => {
    const a = makeExpense({ id: "a", date: "2026-09-01" });
    const b = makeExpense({ id: "b", date: "2026-09-20" });
    expect(sortExpensesByRecency([a, b]).map((e) => e.id)).toEqual(["b", "a"]);
  });
});
