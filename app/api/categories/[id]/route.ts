import { NextRequest, NextResponse } from "next/server";
import { getDb, one, type Category } from "@/lib/db";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const existing = one<{ id: number }>(db, "SELECT id FROM categories WHERE id = ?", id);
  if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: string[] = [];
  const params: Array<string | number | null> = [];
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    updates.push("name = ?");
    params.push(name);
  }
  if (body.color !== undefined) {
    const color = String(body.color).trim();
    if (!HEX_RE.test(color)) {
      return NextResponse.json({ error: "color must be a hex value like #a3b8f0" }, { status: 400 });
    }
    updates.push("color = ?");
    params.push(color);
  }

  if (updates.length > 0) {
    try {
      db.prepare(`UPDATE categories SET ${updates.join(", ")} WHERE id = ?`).run(...params, id);
    } catch {
      return NextResponse.json({ error: "A category with that name already exists" }, { status: 409 });
    }
  }

  const updated = one<Category>(
    db,
    "SELECT id, name, color FROM categories WHERE id = ?",
    id
  );
  return NextResponse.json({ category: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // Expenses are reassigned to uncategorized (ON DELETE SET NULL)
  const result = db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  if (result.changes === 0) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
