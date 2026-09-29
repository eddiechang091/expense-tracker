"use client";

import { useEffect, useState } from "react";
import { api } from "./common";
import { CategoryPie, MonthlyBarChart, money } from "./Charts";

interface MonthDetail {
  month: string;
  total: number;
  count: number;
  average: number;
  byCategory: Array<{ category_id: number | null; category: string; color: string; total: number; count: number }>;
  topExpenses: Array<{ id: number; amount: number; description: string; category_name: string; date: string }>;
}

interface YearSummary {
  year: string;
  months: Array<{ month: string; label: string; total: number; count: number }>;
  byCategory: Array<{ category: string; color: string; total: number; count: number }>;
  yearTotal: number;
  yearCount: number;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

function monthName(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });
}

export default function SummaryView({ refreshToken }: { refreshToken: number }) {
  const [month, setMonth] = useState(monthKey(new Date()));
  const [detail, setDetail] = useState<MonthDetail | null>(null);
  const [year, setYear] = useState<YearSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const y = month.slice(0, 4);
        const [d, ys] = await Promise.all([
          api<MonthDetail>(`/api/summary?month=${month}`),
          api<YearSummary>(`/api/summary?year=${y}`),
        ]);
        setDetail(d);
        setYear(ys);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [month, refreshToken]);

  if (loading || !detail || !year) return <div className="card"><p className="empty">Loading…</p></div>;

  return (
    <>
      <div className="month-nav">
        <button className="btn secondary small" onClick={() => setMonth(shiftMonth(month, -1))}>
          ← Prev
        </button>
        <h2>{monthName(month)}</h2>
        <button className="btn secondary small" onClick={() => setMonth(shiftMonth(month, 1))}>
          Next →
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="label">Total spent</div>
          <div className="value">{money(detail.total)}</div>
        </div>
        <div className="stat">
          <div className="label">Transactions</div>
          <div className="value">{detail.count}</div>
        </div>
        <div className="stat">
          <div className="label">Average</div>
          <div className="value">{money(detail.average)}</div>
        </div>
        <div className="stat">
          <div className="label">{year.year} total</div>
          <div className="value">{money(year.yearTotal)}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Spending by category — {monthName(month)}</h2>
          <CategoryPie data={detail.byCategory} />
        </div>
        <div className="card">
          <h2>Monthly spending — {year.year}</h2>
          <MonthlyBarChart data={year.months} />
        </div>
      </div>

      <div className="card">
        <h2>Category breakdown — {monthName(month)}</h2>
        {detail.byCategory.length === 0 ? (
          <p className="empty">Nothing recorded this month.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>Transactions</th>
                <th className="amount">Total</th>
              </tr>
            </thead>
            <tbody>
              {detail.byCategory.map((c) => (
                <tr key={c.category}>
                  <td>
                    <span className="badge">
                      <span className="dot" style={{ background: c.color }} />
                      {c.category}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>{c.count}</td>
                  <td className="amount">{money(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
