import { useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";
import { useExpenses } from "@/services/expenses/useExpenses";
import { useBudgets } from "@/services/budgets/useBudgets";
import { sortExpensesByRecency } from "@/lib/categories";
import { currentMonthKey, filterByMonth } from "@/lib/analytics";
import { useConversation } from "./useConversation";
import { MessageBubble, TypingBubble } from "./MessageBubble";
import { ChatComposer } from "./ChatComposer";

function WelcomeCard() {
  return (
    <div className="chat-welcome" role="status">
      <span className="chat-welcome-emoji" aria-hidden="true">💬</span>
      <p className="chat-welcome-title">Hey, I'm Money Buddy!</p>
      <p className="chat-welcome-body muted">
        I'm a thoughtful friend who happens to be good with money.
        Ask me anything about your spending, or log an expense and I'll take a look.
      </p>
    </div>
  );
}

export function MoneyBuddyPage() {
  const { expenses } = useExpenses();
  const { budgets } = useBudgets();

  const now = currentMonthKey();
  const monthExpenses = filterByMonth(expenses, now);
  const latestExpense = sortExpensesByRecency(monthExpenses)[0] ?? null;

  const { status, messages, sending, sendError, suggestions, sendMessage, clearMessages, dismissError } =
    useConversation(expenses, budgets, latestExpense);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  if (status === "loading") {
    return (
      <>
        <PageHeader title="Money Buddy" lede="A thoughtful friend who happens to be good with money." />
        <LoadingState label="Getting Money Buddy ready…" />
      </>
    );
  }

  if (status === "unavailable") {
    return (
      <>
        <PageHeader title="Money Buddy" lede="A thoughtful friend who happens to be good with money." />
        <div className="chat-unavailable">
          <span className="chat-welcome-emoji" aria-hidden="true">💬</span>
          <p className="chat-welcome-title">Money Buddy needs Anna</p>
          <p className="muted" style={{ fontSize: 14, maxWidth: "38ch", textAlign: "center" }}>
            Money Buddy uses the Anna Host LLM — no external API keys are ever bundled.
            Open this app inside the Anna host to chat.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Money Buddy"
        actions={
          messages.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void clearMessages()}
              aria-label="Clear conversation"
            >
              Clear
            </Button>
          ) : null
        }
      />

      {/* Message area */}
      <div className="chat-scroll" ref={scrollRef} aria-live="polite" aria-label="Conversation">
        {messages.length === 0 ? <WelcomeCard /> : null}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {sending ? <TypingBubble /> : null}
        {sendError ? (
          <div className="chat-error" role="alert">
            <p className="chat-error-text">{sendError}</p>
            <button type="button" className="btn ghost small" onClick={dismissError}>
              Dismiss
            </button>
          </div>
        ) : null}
      </div>

      {/* Composer */}
      <ChatComposer
        suggestions={suggestions}
        sending={sending}
        disabled={false}
        onSend={(text) => void sendMessage(text)}
        onSuggestion={(text) => void sendMessage(text)}
      />
    </>
  );
}
