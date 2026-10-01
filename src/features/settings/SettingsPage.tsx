import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { AnnaStatusCard } from "./AnnaStatusCard";

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" lede="Preferences, currency, and data controls." />
      <AnnaStatusCard />
      <Card title="Preferences">
        <p className="muted">Currency, tone, voice, and animation preferences arrive in a later phase.</p>
      </Card>
      <Card title="Your data">
        <p className="muted">
          Data is stored per user through Anna Storage. Export and delete controls arrive in a later phase.
        </p>
      </Card>
    </>
  );
}
