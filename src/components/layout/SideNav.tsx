import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NAV_ITEMS } from "./navItems";

export function SideNav({
  route,
  onNavigate,
}: {
  route: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <nav className="side-nav" aria-label="Primary">
      <a
        className="brand"
        href="#/dashboard"
        onClick={(event) => {
          event.preventDefault();
          onNavigate("/dashboard");
        }}
      >
        <span className="brand-mark" aria-hidden="true">
          <Wallet size={18} />
        </span>
        <span>
          <span className="brand-name">Money Companion</span>
          <span className="brand-sub" style={{ display: "block" }}>Friendly money tracking</span>
        </span>
      </a>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = route === item.path;
        return (
          <a
            key={item.path}
            href={"#" + item.path}
            className={active ? "nav-link is-active" : "nav-link"}
            aria-current={active ? "page" : undefined}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(item.path);
            }}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{item.label}</span>
          </a>
        );
      })}
      <span className="nav-spacer" />
      <Button block onClick={() => onNavigate("/add-expense")}>
        <Plus size={16} aria-hidden="true" />
        Add expense
      </Button>
    </nav>
  );
}
