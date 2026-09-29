"use client";

import { useState } from "react";
import { api, today, type Category } from "./common";
import { money } from "./Charts";

export default function ExpenseForm({
  categories,
  onSaved,
}: {
  categories: Category[];
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter a valid non-negative amount.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          amount: parsed,
          description,
          category_id: categoryId === "" ? null : Number(categoryId),
          date,
        }),
      });
      setAmount("");
      setDescription("");
      setDate(today());
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>Add expense</h2>
      {error && <div className="notice error">{error}</div>}
      <form onSubmit={submit}>
        <div className="row">
          <label className="field">
            Amount ($)
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25.00"
              required
            />
          </label>
          <label className="field">
            Description
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Weekly groceries"
            />
          </label>
          <label className="field">
            Category
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Add expense"}
          </button>
        </div>
      </form>
    </div>
  );
}
