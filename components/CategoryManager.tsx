"use client";

import { useState } from "react";
import { api, type Category } from "./common";

const PALETTE = ["#4ade80", "#60a5fa", "#f472b6", "#facc15", "#fb923c", "#a78bfa", "#2dd4bf", "#9ca3af"];

export default function CategoryManager({
  categories,
  onChanged,
}: {
  categories: Category[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ name: "", color: "" });
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), color }),
      });
      setName("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create category.");
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this category? Its expenses become Uncategorized.")) return;
    await api(`/api/categories/${id}`, { method: "DELETE" });
    onChanged();
  }

  async function save(id: number) {
    try {
      await api(`/api/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: draft.name.trim(), color: draft.color }),
      });
      setEditing(null);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save category.");
    }
  }

  return (
    <div className="card">
      <h2>Categories</h2>
      {error && <div className="notice error">{error}</div>}

      <form onSubmit={create} style={{ marginBottom: 16 }}>
        <div className="row">
          <label className="field">
            New category
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pets"
            />
          </label>
          <label className="field" style={{ flex: "0 0 120px" }}>
            Color
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button className="btn" type="submit">
              Add
            </button>
          </div>
        </div>
      </form>

      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Color</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) =>
            editing === c.id ? (
              <tr key={c.id} className="edit-row">
                <td>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="color"
                    value={draft.color}
                    onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                  />
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn small" onClick={() => save(c.id)}>
                    Save
                  </button>{" "}
                  <button className="btn secondary small" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </td>
              </tr>
            ) : (
              <tr key={c.id}>
                <td>
                  <span className="badge">
                    <span className="dot" style={{ background: c.color }} />
                    {c.name}
                  </span>
                </td>
                <td>
                  <span className="hint">{c.color}</span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    className="btn secondary small"
                    onClick={() => {
                      setEditing(c.id);
                      setDraft({ name: c.name, color: c.color });
                    }}
                  >
                    Edit
                  </button>{" "}
                  <button className="btn danger small" onClick={() => remove(c.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
