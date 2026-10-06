import { useDailyDelight } from "./useDailyDelight";

export function DailyDelightCard() {
  const { status, delight } = useDailyDelight();

  if (status === "loading" || !delight) {
    return (
      <div className="delight-card" aria-busy="true">
        <p className="delight-label">✨ Today's little joy</p>
        <p className="delight-text muted">Wrapping something warm for you…</p>
      </div>
    );
  }

  return (
    <div className="delight-card">
      <p className="delight-label">✨ Today's little joy</p>
      <p className="delight-text">“{delight.text}”</p>
    </div>
  );
}
