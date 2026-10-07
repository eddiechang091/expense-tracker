import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { AnnaStatusCard } from "./AnnaStatusCard";
import { THEMES } from "@/services/theme/themes";
import { useTheme } from "@/services/theme/useTheme";

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
      </Card>
    </>
  );
}

