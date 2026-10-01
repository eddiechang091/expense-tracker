import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { money } from "@/lib/utils";
import { useExpenses } from "@/services/expenses/useExpenses";

export function DashboardPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { status, expenses } = useExpenses();
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthExpenses = expenses.filter((expense) => expense.date.slice(0, 7) === monthKey);
  const total = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <>
      <PageHeader title="Dashboard" lede="How is your money doing this month?" />
      <Card title="This month">
        {status === "loading" ? (
          <LoadingState label="Loading your spending…" />
        ) : monthExpenses.length === 0 ? (
          <EmptyState
            emoji={"\uD83C\uDF31"}
            title="No expenses yet"
            action={<Button onClick={() => onNavigate("/add-expense")}>Add your first expense</Button>}
          >
            Add your first expense and your money story will start taking shape.
          </EmptyState>
        ) : (
          <>
            <p className="dashboard-total">{money(total, monthExpenses[0]?.currency || "CAD")}</p>
            <p className="muted">
              {monthExpenses.length === 1 ? "1 expense" : `${monthExpenses.length} expenses`} this month.
            </p>
            <div className="row">
              <Button variant="secondary" size="sm" onClick={() => onNavigate("/expenses")}>
                View expenses
              </Button>
            </div>
          </>
        )}
      </Card>
      <Card title="Where your money goes">
        <p className="muted">Category breakdown and charts arrive in a later phase.</p>
      </Card>
      <Card title="Money insight">
        <p className="muted">Money Buddy insights arrive in a later phase.</p>
      </Card>
    </>
  );
}
