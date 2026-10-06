import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AnnaStatusCard } from "./AnnaStatusCard";
import { saveFishApiKey, saveFishVoiceId } from "@/services/tts/providers/fish";
import { getKvStore } from "@/services/anna/storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { THEMES } from "@/services/theme/themes";
import { useTheme } from "@/services/theme/useTheme";

function FishAudioSettings() {
  const [apiKey, setApiKey] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const store = await getKvStore();
      const [k, v] = await Promise.all([
        store.get<string>(STORAGE_KEYS.fishApiKey),
        store.get<string>(STORAGE_KEYS.fishVoiceId),
      ]);
      if (cancelled) return;
      if (k) setApiKey(k);
      if (v) setVoiceId(v);
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleSave() {
    await Promise.all([saveFishApiKey(apiKey), saveFishVoiceId(voiceId)]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card title="Fish Audio voice">
      <div className="stack" style={{ gap: 14 }}>
        <p className="muted" style={{ fontSize: 13 }}>
          Money Buddy uses Fish Audio for its voice. Enter your Fish Audio API key and a voice reference ID.
          The key is stored in Anna Storage and sent to the Fish voice service only when synthesizing speech
          (it is skipped when the voice service already has its own key configured).
          Get a key at <a href="https://fish.audio" target="_blank" rel="noopener noreferrer">fish.audio</a>.
          Note: on the local dev harness the key can appear in the harness RPC log — avoid sharing logs that contain it.
        </p>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
            API key
          </label>
          <input
            type="password"
            value={apiKey}
            placeholder="sk-fish-…"
            onChange={(e) => { setApiKey(e.target.value); setSaved(false); }}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 10,
              border: "1px solid var(--border-strong)", background: "var(--surface)",
              font: "inherit", fontSize: 13, color: "var(--text)",
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Voice reference ID <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
          </label>
          <input
            type="text"
            value={voiceId}
            placeholder="464388beaa724f8f8947a9fda096f0f5"
            onChange={(e) => { setVoiceId(e.target.value); setSaved(false); }}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 10,
              border: "1px solid var(--border-strong)", background: "var(--surface)",
              font: "inherit", fontSize: 13, color: "var(--text)",
            }}
          />
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Copy the UUID from a Fish Audio voice URL, e.g. fish.audio/m/&lt;uuid&gt;/
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void handleSave()}>
          {saved ? "Saved ✓" : "Save"}
        </Button>
      </div>
    </Card>
  );
}

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
      <FishAudioSettings />
      <Card title="Preferences">
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Pick a theme — it recolors the whole app, your cat companion, and the page background.
        </p>
        <ThemePicker />
      </Card>
    </>
  );
}

