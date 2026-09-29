import { NextRequest, NextResponse } from "next/server";
import { getDb, one, all } from "@/lib/db";

/**
 * GET /api/summary?year=2026
 *   -> totals per month for the year, plus per-category totals for the whole year
 * GET /api/summary?month=2026-09
 *   -> single-month detail: total, count, average, per-category breakdown, top expenses
 */
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const totalRow =
      one<{ total: number; count: number }>(
        db,
        "SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM expenses WHERE date LIKE ?",
        `${month}%`
      ) ?? { total: 0, count: 0 };

    const byCategory = all<{
      category_id: number | null;
      category: string;
      color: string;
      total: number;
      count: number;
    }>(
      db,
      `SELECT c.id AS category_id, COALESCE(c.name, 'Uncategorized') AS category,
              COALESCE(c.color, '#9ca3af') AS color,
              SUM(e.amount) AS total, COUNT(*) AS count
       FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
       WHERE e.date LIKE ?
       GROUP BY c.id, c.name, c.color
       ORDER BY total DESC`,
      `${month}%`
    );

    const top = all<{ id: number; amount: number; description: string; category_name: string; date: string }>(
      db,
      `SELECT e.id, e.amount, e.description, COALESCE(c.name, 'Uncategorized') AS category_name, e.date
       FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
       WHERE e.date LIKE ?
       ORDER BY e.amount DESC LIMIT 5`,
      `${month}%`
    );

    return NextResponse.json({
      month,
      total: totalRow.total,
      count: totalRow.count,
      average: totalRow.count ? totalRow.total / totalRow.count : 0,
      byCategory,
      topExpenses: top,
    });
  }

  const y = year && /^\d{4}$/.test(year) ? year : String(new Date().getFullYear());

  const monthly = all<{ month: string; total: number; count: number }>(
    db,
    `SELECT substr(date, 1, 7) AS month, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
     FROM expenses WHERE date LIKE ?
     GROUP BY substr(date, 1, 7) ORDER BY month ASC`,
    `${y}%`
  );

  // Fill in empty months so the chart is a full 12-month series
  const byMonthMap = new Map(monthly.map((m) => [m.month, m]));
  const months = Array.from({ length: 12 }, (_, i) => {
    const key = `${y}-${String(i + 1).padStart(2, "0")}`;
    const row = byMonthMap.get(key);
    return { month: key, label: monthLabel(key), total: row?.total ?? 0, count: row?.count ?? 0 };
  });

  const byCategory = all<{ category: string; color: string; total: number; count: number }>(
    db,
    `SELECT COALESCE(c.name, 'Uncategorized') AS category,
            COALESCE(c.color, '#9ca3af') AS color,
            SUM(e.amount) AS total, COUNT(*) AS count
     FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
     WHERE e.date LIKE ?
     GROUP BY c.id, c.name, c.color
     ORDER BY total DESC`,
    `${y}%`
  );

  const yearTotal =
    one<{ total: number; count: number }>(
      db,
      "SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM expenses WHERE date LIKE ?",
      `${y}%`
    ) ?? { total: 0, count: 0 };

  return NextResponse.json({
    year: y,
    months,
    byCategory,
    yearTotal: yearTotal.total,
    yearCount: yearTotal.count,
  });
}

function monthLabel(key: string): string {
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = Number(key.slice(5, 7));
  return names[m - 1] ?? key;
}
