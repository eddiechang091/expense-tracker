import type { ConversationMessage } from "./conversationTypes";
import type { InsightResult } from "@/lib/aiSchema";

function AIContent({ result }: { result: InsightResult }) {
  if (result.isFallback) {
    return <p className="bubble-text muted">{result.headline}</p>;
  }
  return (
    <div className="bubble-ai-content">
      <p className="bubble-headline">{result.headline}</p>
      {result.smallTalk ? <p className="bubble-text">{result.smallTalk}</p> : null}
      {result.financialObservation ? (
        <p className="bubble-text muted">{result.financialObservation}</p>
      ) : null}
      {result.suggestion ? <p className="bubble-text">{result.suggestion}</p> : null}
      {result.followUpQuestion ? (
        <p className="bubble-question">{result.followUpQuestion}</p>
      ) : null}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="bubble-row bubble-row--ai" aria-live="polite" aria-label="Money Buddy is thinking">
      <span className="bubble-avatar" aria-hidden="true">💬</span>
      <div className="bubble bubble--ai">
        <span className="typing-dots" aria-hidden="true">
          <span /><span /><span />
        </span>
      </div>
    </div>
  );
}

export function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`bubble-row ${isUser ? "bubble-row--user" : "bubble-row--ai"}`}>
      {!isUser ? (
        <span className="bubble-avatar" aria-hidden="true">💬</span>
      ) : null}
      <div
        className={`bubble ${isUser ? "bubble--user" : "bubble--ai"}`}
        aria-label={isUser ? "Your message" : "Money Buddy's response"}
      >
        {isUser ? (
          <p className="bubble-text">{message.text}</p>
        ) : message.result ? (
          <AIContent result={message.result} />
        ) : (
          <p className="bubble-text">{message.text}</p>
        )}
      </div>
    </div>
  );
}

export { TypingBubble };
