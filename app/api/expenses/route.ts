import { NextRequest, NextResponse } from "next/server";
import { getDb, one, all, type Expense } from "@/lib/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(d: string): boolean {
  if (!DATE_RE.test(d)) return false;
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === day;
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const category = searchParams.get("category");
  const q = searchParams.get("q");
  const limit = Math.min(Number(searchParams.get("limit")) || 500, 2000);

  const where: string[] = [];
  const params: Array<string | number | null> = [];
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    where.push("e.date LIKE ?");
    params.push(`${month}%`);
  }
  if (category) {
    where.push("c.name = ?");
    params.push(category);
  }
  if (q) {
    where.push("(e.description LIKE ? OR e.amount LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }

  const rows = all<Expense>(
    db,
    `SELECT e.id, e.amount, e.description, e.category_id, c.name AS category_name,
            c.color AS category_color, e.date
     FROM expenses e
     LEFT JOIN categories c ON c.id = e.category_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY e.date DESC, e.id DESC
     LIMIT ?`,
    ...params,
    limit
  );

  return NextResponse.json({ expenses: rows });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const description = String(body.description ?? "").trim();
  const date = String(body.date ?? "").trim();
  const rawCategoryId = body.category_id;
  const rawCategoryName = body.category_name;

  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 });
  }
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "date must be a valid YYYY-MM-DD" }, { status: 400 });
  }

  let categoryId: number | null = null;
  if (rawCategoryId !== undefined && rawCategoryId !== null && rawCategoryId !== "") {
    const id = Number(rawCategoryId);
    const cat = one<{ id: number }>(db, "SELECT id FROM categories WHERE id = ?", id);
    if (!cat) return NextResponse.json({ error: "category_id does not exist" }, { status: 400 });
    categoryId = id;
  } else if (typeof rawCategoryName === "string" && rawCategoryName.trim() !== "") {
    const name = rawCategoryName.trim();
    const existing = one<{ id: number }>(db, "SELECT id FROM categories WHERE name = ?", name);
    categoryId = existing
      ? existing.id
      : Number(db.prepare("INSERT INTO categories (name) VALUES (?)").run(name).lastInsertRowid);
  }

  const result = db
    .prepare("INSERT INTO expenses (amount, description, category_id, date) VALUES (?, ?, ?, ?)")
    .run(amount, description, categoryId, date);

  const created = one<Expense>(
    db,
    `SELECT e.id, e.amount, e.description, e.category_id, c.name AS category_name,
            c.color AS category_color, e.date
     FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
     WHERE e.id = ?`,
    Number(result.lastInsertRowid)
  );

  return NextResponse.json({ expense: created }, { status: 201 });
}
