import { useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";

export function ChatComposer({
  suggestions,
  sending,
  disabled,
  onSend,
  onSuggestion,
}: {
  suggestions: string[];
  sending: boolean;
  disabled: boolean;
  onSend: (text: string) => void;
  onSuggestion: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    setText("");
    onSend(trimmed);
    inputRef.current?.focus();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit(text);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(text);
    }
  }

  return (
    <div className="chat-composer">
      {suggestions.length > 0 ? (
        <div className="suggestion-chips" role="list" aria-label="Suggested questions">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              role="listitem"
              className="suggestion-chip"
              disabled={sending || disabled}
              onClick={() => {
                onSuggestion(q);
                inputRef.current?.focus();
              }}
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}
      <form className="composer-form" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="composer-input"
          value={text}
          rows={1}
          placeholder="Ask Money Buddy…"
          disabled={disabled}
          aria-label="Message to Money Buddy"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="submit"
          size="sm"
          disabled={sending || disabled || text.trim().length === 0}
          aria-label="Send message"
        >
          {sending ? "…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
