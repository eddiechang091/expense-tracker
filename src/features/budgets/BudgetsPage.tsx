import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { BudgetProgress } from "@/components/ui/BudgetProgress";

export function BudgetsPage() {
  return (
    <>
      <PageHeader title="Budgets" lede="Simple monthly limits that stay out of your way." />
      <Card title="Monthly budget">
        <EmptyState emoji={"\uD83D\uDC37"} title="No budget yet">
          Setting a monthly budget arrives in a later phase.
        </EmptyState>
      </Card>
      <Card title="Progress preview">
        <BudgetProgress spent={0} limit={0} />
      </Card>
    </>
  );
}
