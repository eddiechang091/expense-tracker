import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { useRoute } from "@/router";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ExpensesPage } from "@/features/expenses/ExpensesPage";
import { AddExpensePage } from "@/features/expenses/AddExpensePage";
import { BudgetsPage } from "@/features/budgets/BudgetsPage";
import { MoneyBuddyPage } from "@/features/ai/MoneyBuddyPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { NotFoundPage } from "@/features/NotFoundPage";
import { ExpensesProvider } from "@/services/expenses/useExpenses";
import { BudgetsProvider } from "@/services/budgets/useBudgets";

export function App() {
  const [route, navigate] = useRoute();

  return (
    <ToastProvider>
      <ExpensesProvider>
        <BudgetsProvider>
          <AppShell route={route} onNavigate={navigate}>
            {renderRoute(route, navigate)}
          </AppShell>
        </BudgetsProvider>
      </ExpensesProvider>
    </ToastProvider>
  );
}

function renderRoute(route: string, navigate: (path: string) => void) {
  switch (route) {
    case "/dashboard":
      return <DashboardPage onNavigate={navigate} />;
    case "/expenses":
      return <ExpensesPage onNavigate={navigate} />;
    case "/add-expense":
      return <AddExpensePage onNavigate={navigate} />;
    case "/budgets":
      return <BudgetsPage />;
    case "/ai":
      return <MoneyBuddyPage />;
    case "/profile":
      return <ProfilePage />;
    case "/settings":
      return <SettingsPage />;
    default:
      return <NotFoundPage onNavigate={navigate} />;
  }
}
