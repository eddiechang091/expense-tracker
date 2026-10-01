import { money } from "@/lib/utils";

export function BudgetProgress({
  spent,
  limit,
  currency = "CAD",
}: {
  spent: number;
  limit: number;
  currency?: string;
}) {
  const ratio = limit > 0 ? spent / limit : 0;
  const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  const over = limit > 0 && spent > limit;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div
        className={over ? "progress is-over" : "progress"}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <span style={{ width: pct + "%" }} />
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        {money(spent, currency)} of {money(limit, currency)}
      </p>
    </div>
  );
}
