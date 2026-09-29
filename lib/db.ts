import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  date: string;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "expenses.db");

const DEFAULT_CATEGORIES: Array<{ name: string; color: string }> = [
  { name: "Groceries", color: "#4ade80" },
  { name: "Utilities", color: "#60a5fa" },
  { name: "Rent", color: "#f472b6" },
  { name: "Transport", color: "#facc15" },
  { name: "Dining", color: "#fb923c" },
  { name: "Entertainment", color: "#a78bfa" },
  { name: "Health", color: "#2dd4bf" },
  { name: "Other", color: "#9ca3af" },
];

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(DB_DIR, { recursive: true });
  const instance = new DatabaseSync(DB_PATH);
  instance.exec("PRAGMA journal_mode = WAL");
  instance.exec("PRAGMA foreign_keys = ON");

  instance.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#9ca3af',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL CHECK (amount >= 0),
      description TEXT NOT NULL DEFAULT '',
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
  `);

  const count = one<{ c: number }>(instance, "SELECT COUNT(*) AS c FROM categories");
  if ((count?.c ?? 0) === 0) {
    instance.exec("BEGIN");
    try {
      const insert = instance.prepare("INSERT INTO categories (name, color) VALUES (?, ?)");
      for (const c of DEFAULT_CATEGORIES) insert.run(c.name, c.color);
      instance.exec("COMMIT");
    } catch (e) {
      instance.exec("ROLLBACK");
      throw e;
    }
  }

  db = instance;
  return instance;
}

/** Minimal transaction helper (node:sqlite has no built-in helper). */
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

type Param = string | number | bigint | null;

/** Typed single-row query (centralizes the cast node:sqlite's typings require). */
export function one<T>(db: DatabaseSync, sql: string, ...params: Param[]): T | undefined {
  return db.prepare(sql).get(...params) as unknown as T | undefined;
}

/** Typed multi-row query. */
export function all<T>(db: DatabaseSync, sql: string, ...params: Param[]): T[] {
  return db.prepare(sql).all(...params) as unknown as T[];
}
