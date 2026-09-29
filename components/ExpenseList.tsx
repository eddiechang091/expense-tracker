"use client";

import { useEffect, useState } from "react";
import { api, monthKey, today, type Category, type Expense } from "./common";
import { money } from "./Charts";

export default function ExpenseList({
  categories,
  refreshToken,
}: {
  categories: Category[];
  refreshToken: number;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(monthKey(new Date()));
  const [filterCategory, setFilterCategory] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ amount: "", description: "", category_id: "", date: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterMonth) params.set("month", filterMonth);
      if (filterCategory) params.set("category", filterCategory);
      if (query.trim()) params.set("q", query.trim());
      const data = await api<{ expenses: Expense[] }>(`/api/expenses?${params}`);
      setExpenses(data.expenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load expenses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, filterMonth, filterCategory]);

  async function remove(id: number) {
    if (!confirm("Delete this expense?")) return;
    await api(`/api/expenses/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(e: Expense) {
    setEditing(e.id);
    setDraft({
      amount: String(e.amount),
      description: e.description,
      category_id: e.category_id ? String(e.category_id) : "",
      date: e.date,
    });
  }

  async function saveEdit(id: number) {
    try {
      await api(`/api/expenses/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          amount: Number(draft.amount),
          description: draft.description,
          category_id: draft.category_id === "" ? null : Number(draft.category_id),
          date: draft.date,
        }),
      });
      setEditing(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save changes.");
    }
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="card">
      <div className="toolbar">
        <h2>Expenses</h2>
        <span className="hint">
          {expenses.length} entries · total {money(total)}
        </span>
      </div>

      <div className="filters">
        <label className="field">
          Month
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </label>
        <label className="field">
          Category
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Search
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Description or amount"
          />
        </label>
        <button className="btn secondary small" onClick={load}>
          Search
        </button>
        <button
          className="btn secondary small"
          onClick={() => {
            setFilterMonth("");
            setFilterCategory("");
            setQuery("");
          }}
        >
          Clear
        </button>
      </div>

      {error && <div className="notice error">{error}</div>}
      {loading ? (
        <p className="empty">Loading…</p>
      ) : expenses.length === 0 ? (
        <p className="empty">No expenses found. Add one above or import a CSV.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th className="amount">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) =>
                editing === e.id ? (
                  <tr key={e.id} className="edit-row">
                    <td>
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(ev) => setDraft({ ...draft, date: ev.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={draft.description}
                        onChange={(ev) => setDraft({ ...draft, description: ev.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={draft.category_id}
                        onChange={(ev) => setDraft({ ...draft, category_id: ev.target.value })}
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={draft.amount}
                        onChange={(ev) => setDraft({ ...draft, amount: ev.target.value })}
                        style={{ textAlign: "right" }}
                      />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn small" onClick={() => saveEdit(e.id)}>
                        Save
                      </button>{" "}
                      <button className="btn secondary small" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{e.date}</td>
                    <td>{e.description || <span className="hint">—</span>}</td>
                    <td>
                      <span className="badge">
                        <span
                          className="dot"
                          style={{ background: e.category_color ?? "#9ca3af" }}
                        />
                        {e.category_name ?? "Uncategorized"}
                      </span>
                    </td>
                    <td className="amount">{money(e.amount)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn secondary small" onClick={() => startEdit(e)}>
                        Edit
                      </button>{" "}
                      <button className="btn danger small" onClick={() => remove(e.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
