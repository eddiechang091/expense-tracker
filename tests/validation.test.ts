import { describe, expect, it } from "vitest";
import { validateExpenseDraft } from "@/lib/validation";

describe("validateExpenseDraft", () => {
  it("accepts a minimal valid draft", () => {
    const result = validateExpenseDraft({
      amountText: "12.50",
      categoryId: "food",
      description: "Lunch",
      date: "2026-09-15",
      paymentMethod: "Card",
      notes: "",
    });
    expect(result.errors).toEqual({});
    expect(result.value).toMatchObject({ amount: 12.5, categoryId: "food", date: "2026-09-15" });
  });

  it("rejects zero, negative, and blank amounts", () => {
    for (const amountText of ["", "0", "-3", "abc"]) {
      const result = validateExpenseDraft({
        amountText,
        categoryId: "",
        description: "",
        date: "2026-09-15",
        paymentMethod: "",
        notes: "",
      });
      expect(result.value).toBeNull();
      expect(result.errors.amount).toBeTruthy();
    }
  });

  it("rejects bad dates and unknown categories", () => {
    const badDate = validateExpenseDraft({
      amountText: "5",
      categoryId: "",
      description: "",
      date: "2026-13-40",
      paymentMethod: "",
      notes: "",
    });
    expect(badDate.errors.date).toBeTruthy();

    const badCategory = validateExpenseDraft({
      amountText: "5",
      categoryId: "yacht",
      description: "",
      date: "2026-09-15",
      paymentMethod: "",
      notes: "",
    });
    expect(badCategory.errors.category).toBeTruthy();
  });

  it("treats blank category as uncategorized and trims text", () => {
    const result = validateExpenseDraft({
      amountText: "9.99",
      categoryId: "",
      description: "  Coffee  ",
      date: "2026-09-15",
      paymentMethod: "  Cash ",
      notes: "  ",
    });
    expect(result.value).toMatchObject({ categoryId: null, description: "Coffee", paymentMethod: "Cash", notes: "" });
  });

  it("enforces length caps", () => {
    const result = validateExpenseDraft({
      amountText: "5",
      categoryId: "",
      description: "x".repeat(200),
      date: "2026-09-15",
      paymentMethod: "",
      notes: "y".repeat(600),
    });
    expect(result.errors.description).toBeTruthy();
    expect(result.errors.notes).toBeTruthy();
  });
});
