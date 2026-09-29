# Household Expense Tracker

A small Next.js app for tracking household expenses, backed by SQLite
(`better-sqlite3`). No external database or auth needed.

## Features

- **CRUD**: add, edit, and delete expenses
- **Categories**: create, rename, recolor, and delete categories (with 8 seeded defaults)
- **Monthly summaries**: totals, averages, per-category breakdown, biggest expenses
- **Charts**: monthly bar chart for the year + category pie chart (recharts)
- **CSV import**: upload a bank export and import it in one go

## Prerequisites

- Node.js 18.18+ (Node 20+ recommended)
- npm

## Run it locally

```bash
cd expense-tracker
npm install
npm run dev
```

Then open http://localhost:3000.

The SQLite database is created automatically at `data/expenses.db` on first
start (it's git-ignored). Seeded categories appear on first run.

## CSV format

Columns are case-insensitive; the header row is required:

```csv
date,description,amount,category
2026-09-01,Weekly groceries,84.20,Groceries
2026-09-05,Electric bill,132.45,Utilities
```

- `date` must be `YYYY-MM-DD`
- `amount` may include `$` and commas; negative values are stored as positive spending
- `category` names are created automatically when they don't exist
- Rows with bad dates/amounts are skipped and reported

## API

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/expenses` | List (supports `?month=YYYY-MM`, `?category=`, `?q=`, `?limit=`) / create |
| GET/PUT/DELETE | `/api/expenses/:id` | Read / update / delete one expense |
| GET/POST | `/api/categories` | List / create |
| PUT/DELETE | `/api/categories/:id` | Update / delete (expenses become Uncategorized) |
| GET | `/api/summary?month=YYYY-MM` | Monthly totals, breakdown, top expenses |
| GET | `/api/summary?year=YYYY` | 12-month series, yearly totals, category totals |
| POST | `/api/import` | CSV import (JSON `{ csv }` or multipart `file`) |

## Build for production

```bash
npm run build
npm start
```
