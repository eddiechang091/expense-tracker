import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { getDb, transaction, one } from "@/lib/db";

/**
 * POST /api/import
 * Accepts JSON { csv: string } or multipart form-data with a `file` field.
 * Expected columns (case-insensitive): date, description, amount, category
 * - date: YYYY-MM-DD
 * - amount: number (negative amounts are stored as positive spending)
 * - category: created on the fly if it doesn't exist
 */
export async function POST(req: NextRequest) {
  let csvText = "";
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded (expected form field 'file')" }, { status: 400 });
    }
    csvText = await file.text();
  } else {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (typeof body.csv !== "string") {
      return NextResponse.json({ error: "Expected JSON body { csv: string }" }, { status: 400 });
    }
    csvText = body.csv;
  }

  if (!csvText.trim()) return NextResponse.json({ error: "CSV is empty" }, { status: 400 });

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0 && !parsed.data.length) {
    return NextResponse.json(
      { error: `Could not parse CSV: ${parsed.errors[0].message}` },
      { status: 400 }
    );
  }

  const db = getDb();
  const categoryCache = new Map<string, number>();
  const resolveCategory = (raw: string): number | null => {
    const name = raw.trim();
    if (!name) return null;
    if (categoryCache.has(name)) return categoryCache.get(name)!;
    const existing = one<{ id: number }>(db, "SELECT id FROM categories WHERE name = ?", name);
    const id = existing
      ? existing.id
      : Number(db.prepare("INSERT INTO categories (name) VALUES (?)").run(name).lastInsertRowid);
    categoryCache.set(name, id);
    return id;
  };

  const insert = db.prepare(
    "INSERT INTO expenses (amount, description, category_id, date) VALUES (?, ?, ?, ?)"
  );

  let imported = 0;
  const errors: string[] = [];

  transaction(db, () => {
    parsed.data.forEach((row, i) => {
      const line = i + 2; // header is line 1
      try {
        const date = (row.date ?? "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          errors.push(`Row ${line}: invalid or missing date "${row.date ?? ""}"`);
          return;
        }
        const amountRaw = String(row.amount ?? "").trim();
        if (amountRaw === "") {
          errors.push(`Row ${line}: missing amount`);
          return;
        }
        const rawAmount = Number(amountRaw.replace(/[$,]/g, ""));
        if (!Number.isFinite(rawAmount)) {
          errors.push(`Row ${line}: invalid amount "${row.amount ?? ""}"`);
          return;
        }
        const description = (row.description ?? "").trim();
        const categoryId = resolveCategory(row.category ?? "");
        insert.run(Math.abs(rawAmount), description, categoryId, date);
        imported++;
      } catch (e) {
        errors.push(`Row ${line}: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    });
  });

  return NextResponse.json({ imported, skipped: errors.length, errors: errors.slice(0, 25) });
}
