import type { InsightResult } from "@/lib/aiSchema";
import { LoadingState } from "@/components/ui/States";

function InsightContent({ result }: { result: InsightResult }) {
  return (
    <div className="ai-insight">
      {result.isFallback ? (
        <p className="ai-insight-headline muted">{result.headline}</p>
      ) : (
        <>
          <p className="ai-insight-headline">{result.headline}</p>
          {result.smallTalk ? (
            <p className="ai-insight-body">{result.smallTalk}</p>
          ) : null}
          {result.financialObservation ? (
            <p className="ai-insight-observation muted">{result.financialObservation}</p>
          ) : null}
          {result.suggestion ? (
            <p className="ai-insight-suggestion">{result.suggestion}</p>
          ) : null}
          {result.followUpQuestion ? (
            <p className="ai-insight-question">{result.followUpQuestion}</p>
          ) : null}
        </>
      )}
    </div>
  );
}

export function AIInsightCard({
  status,
  result,
}: {
  status: "idle" | "loading" | "ready" | "unavailable" | "error";
  result: InsightResult | null;
}) {
  if (status === "idle" || status === "unavailable") return null;

  return (
    <div className="ai-insight-card">
      <div className="ai-insight-header">
        <span className="ai-insight-badge" aria-hidden="true">💬</span>
        <span className="ai-insight-label">Money Buddy</span>
      </div>
      {status === "loading" ? (
        <LoadingState label="Money Buddy is thinking…" />
      ) : status === "error" ? (
        <p className="muted" style={{ fontSize: 14 }}>Money Buddy is taking a tiny break. Try again in a moment.</p>
      ) : result ? (
        <InsightContent result={result} />
      ) : null}
    </div>
  );
}


