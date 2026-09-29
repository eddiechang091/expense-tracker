import { NextRequest, NextResponse } from "next/server";
import { getDb, one, all, type Category } from "@/lib/db";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function GET() {
  const db = getDb();
  const categories = all<Category>(db, "SELECT id, name, color FROM categories ORDER BY name ASC");
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  const color = String(body.color ?? "#9ca3af").trim();

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!HEX_RE.test(color)) {
    return NextResponse.json({ error: "color must be a hex value like #a3b8f0" }, { status: 400 });
  }

  try {
    const result = db.prepare("INSERT INTO categories (name, color) VALUES (?, ?)").run(name, color);
    const created = one<Category>(
      db,
      "SELECT id, name, color FROM categories WHERE id = ?",
      Number(result.lastInsertRowid)
    );
    return NextResponse.json({ category: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A category with that name already exists" }, { status: 409 });
  }
}
