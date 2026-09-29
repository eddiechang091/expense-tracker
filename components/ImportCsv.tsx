"use client";

import { useState } from "react";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export default function ImportCsv({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data as ImportResult);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Import CSV</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Upload a CSV with these columns (case-insensitive): <code>date</code>,{" "}
        <code>description</code>, <code>amount</code>, <code>category</code>. New categories are
        created automatically.
      </p>
      <pre className="sample">
{`date,description,amount,category
2026-09-01,Weekly groceries,84.20,Groceries
2026-09-05,Electric bill,132.45,Utilities
2026-09-12,Bus pass,60.00,Transport`}
      </pre>
      {error && <div className="notice error">{error}</div>}
      {result && (
        <div className="notice ok">
          Imported {result.imported} expense{result.imported === 1 ? "" : "s"}.
          {result.skipped > 0 && (
            <>
              {" "}Skipped {result.skipped} row{result.skipped === 1 ? "" : "s"}:
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <form onSubmit={run}>
        <div className="row">
          <label className="field">
            CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button className="btn" type="submit" disabled={busy || !file}>
              {busy ? "Importing…" : "Import"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
