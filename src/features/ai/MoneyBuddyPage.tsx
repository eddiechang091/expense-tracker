import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";

export function MoneyBuddyPage() {
  return (
    <>
      <PageHeader title="Money Buddy" lede="A thoughtful friend who happens to be good with money." />
      <Card>
        <EmptyState emoji={"\uD83D\uDCAC"} title="Conversation arrives in a later phase">
          Money Buddy will use the Anna Host LLM, so no model provider key is ever shipped in the app.
        </EmptyState>
      </Card>
    </>
  );
}
