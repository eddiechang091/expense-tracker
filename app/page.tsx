"use client";

import { useEffect, useState } from "react";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import CategoryManager from "@/components/CategoryManager";
import ImportCsv from "@/components/ImportCsv";
import SummaryView from "@/components/SummaryView";
import { api, type Category } from "@/components/common";

type Tab = "expenses" | "summary" | "categories" | "import";

export default function Home() {
  const [tab, setTab] = useState<Tab>("expenses");
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  async function loadCategories() {
    const data = await api<{ categories: Category[] }>("/api/categories");
    setCategories(data.categories);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function refresh() {
    setRefreshToken((t) => t + 1);
    loadCategories();
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "expenses", label: "Expenses" },
    { id: "summary", label: "Summary & Charts" },
    { id: "categories", label: "Categories" },
    { id: "import", label: "Import CSV" },
  ];

  return (
    <div className="container">
      <header className="top">
        <div>
          <h1>🏠 Household Expense Tracker</h1>
          <p>Track spending, see where it goes, and import bank exports.</p>
        </div>
      </header>

      <nav className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "expenses" && (
        <>
          <ExpenseForm categories={categories} onSaved={refresh} />
          <ExpenseList categories={categories} refreshToken={refreshToken} />
        </>
      )}
      {tab === "summary" && <SummaryView refreshToken={refreshToken} />}
      {tab === "categories" && <CategoryManager categories={categories} onChanged={refresh} />}
      {tab === "import" && <ImportCsv onImported={refresh} />}
    </div>
  );
}
