import { NextRequest, NextResponse } from "next/server";
import { getDb, one, type Expense } from "@/lib/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(d: string): boolean {
  if (!DATE_RE.test(d)) return false;
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === day;
}

function fetchOne(db: ReturnType<typeof getDb>, id: number): Expense | undefined {
  return one<Expense>(
    db,
    `SELECT e.id, e.amount, e.description, e.category_id, c.name AS category_name,
            c.color AS category_color, e.date
     FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
     WHERE e.id = ?`,
    id
  );
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const expense = fetchOne(db, id);
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  return NextResponse.json({ expense });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const existing = one<{ id: number }>(db, "SELECT id FROM expenses WHERE id = ?", id);
  if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: string[] = [];
  const params: Array<string | number | null> = [];

  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 });
    }
    updates.push("amount = ?");
    params.push(amount);
  }
  if (body.description !== undefined) {
    updates.push("description = ?");
    params.push(String(body.description).trim());
  }
  if (body.date !== undefined) {
    const date = String(body.date).trim();
    if (!isValidDate(date)) {
      return NextResponse.json({ error: "date must be a valid YYYY-MM-DD" }, { status: 400 });
    }
    updates.push("date = ?");
    params.push(date);
  }
  if (body.category_id !== undefined) {
    if (body.category_id === null || body.category_id === "") {
      updates.push("category_id = NULL");
    } else {
      const cid = Number(body.category_id);
      const cat = one<{ id: number }>(db, "SELECT id FROM categories WHERE id = ?", cid);
      if (!cat) return NextResponse.json({ error: "category_id does not exist" }, { status: 400 });
      updates.push("category_id = ?");
      params.push(cid);
    }
  }

  if (updates.length > 0) {
    db.prepare(`UPDATE expenses SET ${updates.join(", ")} WHERE id = ?`).run(...params, id);
  }

  return NextResponse.json({ expense: fetchOne(db, id) });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const result = db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
  if (result.changes === 0) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
