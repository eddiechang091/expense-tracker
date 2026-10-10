import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { AnnaStatusCard } from "./AnnaStatusCard";
import { THEMES } from "@/services/theme/themes";
import { useTheme } from "@/services/theme/useTheme";
import { CURRENCIES } from "@/lib/currencies";
import { useProfile } from "@/services/profile/useProfile";
import { useExpenses } from "@/services/expenses/useExpenses";
import { useBudgets } from "@/services/budgets/useBudgets";
import { getRate } from "@/services/fx/rates";
import { convertAllToCurrency } from "@/services/fx/convert";

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-grid" role="group" aria-label="App theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`theme-card${theme === t.id ? " is-selected" : ""}`}
          onClick={() => setTheme(t.id)}
          aria-pressed={theme === t.id}
        >
          <span className="theme-swatch" style={{ background: t.swatch }} aria-hidden="true">
            <span className="theme-emoji">{t.emoji}</span>
          </span>
          <span className="theme-name">{t.name}</span>
          <span className="theme-tagline">{t.tagline}</span>
          {theme === t.id && <span className="theme-check" aria-hidden="true">✓</span>}
        </button>
      ))}
    </div>
  );
}

function CurrencyPicker() {
  const { profile, update } = useProfile();
  const { notify } = useToast();
  const { expenses, updateExpense } = useExpenses();
  const { budgets, saveBudget } = useBudgets();
  const current = profile.currency || "USD";
  const [pending, setPending] = useState<string | null>(null);
  const [previewRate, setPreviewRate] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);

  const toConvertExpenses = expenses.filter((e) => e.currency.toUpperCase() !== (pending ?? current).toUpperCase()).length;
  const toConvertBudgets = budgets.filter((b) => b.currency.toUpperCase() !== (pending ?? current).toUpperCase()).length;

  async function handleChange(next: string) {
    const from = (profile.currency ?? "USD").toUpperCase();
    const to = next.toUpperCase();
    if (from === to) return;
    // Fetch the rate first so the dialog can show it
    const rate = await getRate(from, to);
    if (rate === null) {
      notify("Couldn't fetch the exchange rate. Try again later.", "error");
      return;
    }
    setPreviewRate(rate);
    setPending(next);
  }

  async function handleConfirm() {
    if (!pending) return;
    const to = pending.toUpperCase();
    setConverting(true);
    try {
      const plan = await convertAllToCurrency(expenses, budgets, to, updateExpense, saveBudget);
      update({ currency: pending });
      notify(
        `Currency changed. Converted ${plan.expenseCount} expense${plan.expenseCount === 1 ? "" : "s"} and ${plan.budgetCount} budget${plan.budgetCount === 1 ? "" : "s"}.`
      );
    } catch {
      notify("Conversion failed — currency not changed. Try again later.", "error");
    } finally {
      setConverting(false);
      setPending(null);
      setPreviewRate(null);
    }
  }

  return (
    <div>
      <label
        htmlFor="default-currency"
        style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}
      >
        Default currency
      </label>
      <select
        id="default-currency"
        value={pending ?? current}
        onChange={(e) => void handleChange(e.target.value)}
        className="input"
        style={{ maxWidth: 320 }}
        disabled={converting}
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} — {c.name} ({c.symbol})
          </option>
        ))}
      </select>
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        Used as the default when logging expenses and setting budgets. Expenses
        logged in another currency are converted to this using live rates.
        Changing it converts all existing expenses and budgets at the current rate.
      </p>
      <ConfirmDialog
        open={pending !== null}
        title="Change default currency?"
        body={
          previewRate !== null && pending
            ? `All amounts will be converted from ${current} to ${pending} at 1 ${current} = ${previewRate.toFixed(4)} ${pending} ` +
              `(${toConvertExpenses} expense${toConvertExpenses === 1 ? "" : "s"}, ${toConvertBudgets} budget${toConvertBudgets === 1 ? "" : "s"}). This cannot be undone automatically.`
            : undefined
        }
        confirmLabel={converting ? "Converting…" : "Convert everything"}
        cancelLabel="Keep it"
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          setPending(null);
          setPreviewRate(null);
        }}
      />
    </div>
  );
}

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" lede="Preferences, currency, and data controls." />
      <AnnaStatusCard />
      <Card title="Preferences">
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Pick a theme — it recolors the whole app, your cat companion, and the page background.
        </p>
        <ThemePicker />
        <div style={{ marginTop: 24 }}>
          <CurrencyPicker />
        </div>
      </Card>
    </>
  );
}

