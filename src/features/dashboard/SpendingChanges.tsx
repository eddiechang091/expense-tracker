import type { SpendingChange } from "@/lib/analytics";
import { getCategoryById } from "@/lib/categories";
import { money } from "@/lib/utils";

const KIND_EMOJI: Record<string, string> = {
  increase: "↑",
  decrease: "↓",
  new: "✨",
  gone: "✅",
};

function friendlyMessage(change: SpendingChange, currency: string): string {
  const cat = getCategoryById(change.categoryId);
  const name = cat?.name ?? "Other spending";
  const delta = money(Math.abs(change.delta), currency);
  switch (change.kind) {
    case "increase":
      return `${name} was a bit higher this month (+${delta})`;
    case "decrease":
      return `${name} came down nicely this month (−${delta})`;
    case "new":
      return `New spending on ${name.toLowerCase()} this month`;
    case "gone":
      return `No ${name.toLowerCase()} spending this month`;
  }
}

export function SpendingChanges({
  changes,
  currency,
}: {
  changes: SpendingChange[];
  currency: string;
}) {
  if (changes.length === 0) return null;
  return (
    <ul className="changes-list stack" style={{ gap: 10 }} aria-label="Spending changes">
      {changes.map((change) => {
        const cat = getCategoryById(change.categoryId);
        const emoji = cat?.icon ?? KIND_EMOJI[change.kind] ?? "•";
        return (
          <li key={change.id} className="change-item">
            <span className="change-icon" aria-hidden="true">{emoji}</span>
            <span className="change-text">{friendlyMessage(change, currency)}</span>
          </li>
        );
      })}
    </ul>
  );
}
