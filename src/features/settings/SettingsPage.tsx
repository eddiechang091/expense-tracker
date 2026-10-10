import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { AnnaStatusCard } from "./AnnaStatusCard";
import { THEMES } from "@/services/theme/themes";
import { useTheme } from "@/services/theme/useTheme";
import { CURRENCIES } from "@/lib/currencies";
import { useProfile } from "@/services/profile/useProfile";

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
  const current = profile.currency || "USD";
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
        value={current}
        onChange={(e) => update({ currency: e.target.value })}
        className="input"
        style={{ maxWidth: 320 }}
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
      </p>
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

