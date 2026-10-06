import {
  LayoutDashboard,
  ReceiptText,
  PiggyBank,
  MessageCircle,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  bottom: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, bottom: true },
  { path: "/expenses", label: "Expenses", icon: ReceiptText, bottom: true },
  { path: "/budgets", label: "Budgets", icon: PiggyBank, bottom: true },
  { path: "/ai", label: "Money Buddy", icon: MessageCircle, bottom: true },
  { path: "/settings", label: "Settings", icon: Settings, bottom: true },
];
