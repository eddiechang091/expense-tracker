// Smoke test for the expense tracker API. Run with: npm test
// Expects the dev server (or `next start`) on http://localhost:3000
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function j(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { res, data };
}

try {
  // 1. Seeded categories exist
  let r = await j("GET", "/api/categories");
  check("GET /api/categories", r.res.ok && r.data.categories.length >= 8,
    `${r.data.categories.length} categories`);
  const groceries = r.data.categories.find((c) => c.name === "Groceries");

  // 2. Create a new category
  r = await j("POST", "/api/categories", { name: "Pets", color: "#f472b6" });
  check("POST /api/categories (create Pets)", r.res.status === 201 && r.data.category.name === "Pets");
  const petsId = r.data.category.id;

  // 3. Duplicate category name is rejected
  r = await j("POST", "/api/categories", { name: "Pets" });
  check("POST /api/categories (duplicate rejected)", r.res.status === 409);

  // 4. Create an expense
  r = await j("POST", "/api/expenses", {
    amount: 42.5, description: "Dog food", category_id: petsId, date: "2026-09-10",
  });
  check("POST /api/expenses (create)", r.res.status === 201 && r.data.expense.category_name === "Pets");
  const expenseId = r.data.expense.id;

  // 5. Reject invalid expense
  r = await j("POST", "/api/expenses", { amount: -5, description: "x", date: "2026-09-10" });
  check("POST /api/expenses (negative amount rejected)", r.res.status === 400);
  r = await j("POST", "/api/expenses", { amount: 5, description: "x", date: "2026-13-40" });
  check("POST /api/expenses (bad date rejected)", r.res.status === 400);

  // 6. Create expense with category_name (auto-resolve existing)
  r = await j("POST", "/api/expenses", {
    amount: 84.2, description: "Weekly groceries", category_name: "Groceries", date: "2026-09-01",
  });
  check("POST /api/expenses (category_name resolve)", r.res.status === 201 && r.data.expense.category_name === "Groceries");

  // 7. List with filters
  r = await j("GET", "/api/expenses?month=2026-09");
  check("GET /api/expenses?month=", r.res.ok && r.data.expenses.length >= 2,
    `${r.data.expenses.length} rows`);
  r = await j("GET", "/api/expenses?month=2026-09&category=Groceries");
  check("GET /api/expenses (category filter)", r.res.ok && r.data.expenses.every((e) => e.category_name === "Groceries"));
  r = await j("GET", "/api/expenses?q=Dog%20food");
  check("GET /api/expenses (search)", r.res.ok && r.data.expenses.some((e) => e.description === "Dog food"));

  // 8. Update expense
  r = await j("PUT", `/api/expenses/${expenseId}`, { amount: 45.0, description: "Dog food (large bag)" });
  check("PUT /api/expenses/:id", r.res.ok && r.data.expense.amount === 45.0);
  r = await j("PUT", `/api/expenses/999999`, { amount: 1 });
  check("PUT /api/expenses/:id (missing → 404)", r.res.status === 404);

  // 9. Monthly summary
  r = await j("GET", "/api/summary?month=2026-09");
  check("GET /api/summary?month=", r.res.ok && r.data.total > 0 && r.data.byCategory.length >= 2,
    `total=$${r.data.total}`);

  // 10. Yearly summary has 12 months
  r = await j("GET", "/api/summary?year=2026");
  check("GET /api/summary?year=", r.res.ok && r.data.months.length === 12 && r.data.months[8].total > 0,
    `sep total=$${r.data.months[8].total}`);

  // 11. CSV import
  const csv = "date,description,amount,category\n2026-09-15,Vet checkup,120.00,Health\n2026-09-16,Not a date,,Other\n2026-09-17,Bus pass,60,Transport";
  r = await j("POST", "/api/import", { csv });
  check("POST /api/import", r.res.ok && r.data.imported === 2 && r.data.skipped === 1,
    `imported=${r.data.imported} skipped=${r.data.skipped}`);

  // 12. Delete expense
  r = await j("DELETE", `/api/expenses/${expenseId}`);
  check("DELETE /api/expenses/:id", r.res.ok);
  r = await j("GET", `/api/expenses/${expenseId}`);
  check("GET /api/expenses/:id after delete (404)", r.res.status === 404);

  // 13. Delete category → expenses become uncategorized
  r = await j("DELETE", `/api/categories/${petsId}`);
  check("DELETE /api/categories/:id", r.res.ok);
  r = await j("GET", "/api/categories");
  check("category gone from list", !r.data.categories.some((c) => c.name === "Pets"));

  // 14. Homepage renders
  const page = await fetch(`${BASE}/`);
  const html = await page.text();
  check("GET / (homepage renders)", page.ok && html.includes("Household Expense Tracker"));
} catch (e) {
  console.error("Smoke test crashed:", e);
  process.exitCode = 1;
}

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exitCode = failed.length ? 1 : 0;
