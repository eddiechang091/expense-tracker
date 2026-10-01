import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";

export function InsightsPage() {
  return (
    <>
      <PageHeader title="Insights" lede="Meaningful changes in your spending." />
      <Card>
        <EmptyState emoji={"\u2728"} title="No insights yet">
          Insights appear once you have some expenses recorded.
        </EmptyState>
      </Card>
    </>
  );
}
