import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export function NotFoundPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <>
      <PageHeader title="Page not found" />
      <Card>
        <EmptyState
          emoji={"\uD83E\uDDED"}
          title="That page does not exist"
          action={<Button onClick={() => onNavigate("/dashboard")}>Back to dashboard</Button>}
        />
      </Card>
    </>
  );
}
