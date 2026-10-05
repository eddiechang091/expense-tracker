import type { KeyboardEvent } from "react";
import type { InsightResult } from "@/lib/aiSchema";
import { useTTS } from "@/services/tts/useTTS";
import { resultToSpeechText } from "@/services/tts/textUtils";

// ---------------------------------------------------------------------------
// Inline SVG Lucky Cat (Maneki-neko)
// CSS/SVG illustration — no remote assets, no external libraries.
// ---------------------------------------------------------------------------
function LuckyCatSVG({ speaking }: { speaking: boolean }) {
  return (
    <svg
      viewBox="0 0 120 140"
      xmlns="http://www.w3.org/2000/svg"
      className={`lucky-cat-svg${speaking ? " is-speaking" : ""}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* Body */}
      <ellipse cx="60" cy="100" rx="32" ry="36" fill="#fff8f0" stroke="#e8d5c0" strokeWidth="2" />

      {/* Left sitting leg */}
      <ellipse cx="38" cy="126" rx="12" ry="8" fill="#fff8f0" stroke="#e8d5c0" strokeWidth="1.5" />
      {/* Right sitting leg */}
      <ellipse cx="82" cy="126" rx="12" ry="8" fill="#fff8f0" stroke="#e8d5c0" strokeWidth="1.5" />

      {/* Tail */}
      <path d="M88 115 Q112 100 106 82 Q102 70 92 76" fill="none" stroke="#e8d5c0" strokeWidth="4" strokeLinecap="round" />

      {/* Left arm (down) */}
      <ellipse cx="30" cy="95" rx="7" ry="12" fill="#fff8f0" stroke="#e8d5c0" strokeWidth="1.5" transform="rotate(-15 30 95)" />

      {/* Right arm — raised (beckoning paw) */}
      <g className="lucky-cat-paw">
        <ellipse cx="90" cy="70" rx="7" ry="14" fill="#fff8f0" stroke="#e8d5c0" strokeWidth="1.5" transform="rotate(30 90 70)" />
        {/* Paw */}
        <circle cx="95" cy="58" r="7" fill="#fff8f0" stroke="#e8d5c0" strokeWidth="1.5" />
        {/* Paw lines */}
        <line x1="91" y1="54" x2="91" y2="60" stroke="#e8d5c0" strokeWidth="1" strokeLinecap="round" />
        <line x1="95" y1="53" x2="95" y2="60" stroke="#e8d5c0" strokeWidth="1" strokeLinecap="round" />
        <line x1="99" y1="54" x2="99" y2="60" stroke="#e8d5c0" strokeWidth="1" strokeLinecap="round" />
      </g>

      {/* Head */}
      <circle cx="60" cy="60" r="30" fill="#fff8f0" stroke="#e8d5c0" strokeWidth="2" />

      {/* Left ear */}
      <polygon points="36,40 30,18 46,32" fill="#fff8f0" stroke="#e8d5c0" strokeWidth="1.5" />
      <polygon points="37,38 32,22 44,33" fill="#ffb3c1" />
      {/* Right ear */}
      <polygon points="84,40 90,18 74,32" fill="#fff8f0" stroke="#e8d5c0" strokeWidth="1.5" />
      <polygon points="83,38 88,22 76,33" fill="#ffb3c1" />

      {/* Eyes */}
      <ellipse cx="50" cy="58" rx="5" ry="6" fill="#2b2a33" />
      <ellipse cx="70" cy="58" rx="5" ry="6" fill="#2b2a33" />
      {/* Eye shine */}
      <circle cx="52" cy="56" r="2" fill="white" />
      <circle cx="72" cy="56" r="2" fill="white" />

      {/* Nose */}
      <ellipse cx="60" cy="67" rx="3" ry="2" fill="#ffb3c1" />
      {/* Mouth */}
      <path d="M55 70 Q60 74 65 70" fill="none" stroke="#e8d5c0" strokeWidth="1.5" strokeLinecap="round" />
      {/* Whiskers */}
      <line x1="30" y1="66" x2="50" y2="68" stroke="#e8d5c0" strokeWidth="1" strokeLinecap="round" />
      <line x1="30" y1="70" x2="50" y2="70" stroke="#e8d5c0" strokeWidth="1" strokeLinecap="round" />
      <line x1="70" y1="68" x2="90" y2="66" stroke="#e8d5c0" strokeWidth="1" strokeLinecap="round" />
      <line x1="70" y1="70" x2="90" y2="70" stroke="#e8d5c0" strokeWidth="1" strokeLinecap="round" />

      {/* Collar */}
      <path d="M35 80 Q60 88 85 80" fill="none" stroke="#6c5ce7" strokeWidth="5" strokeLinecap="round" />
      {/* Bell */}
      <circle cx="60" cy="82" r="5" fill="#f4b740" stroke="#e8d5c0" strokeWidth="1" />
      <line x1="60" y1="84" x2="60" y2="87" stroke="#e8d5c0" strokeWidth="1" />

      {/* Speaking glow ring */}
      {speaking && (
        <circle cx="60" cy="60" r="32" fill="none" stroke="#6c5ce7" strokeWidth="2" opacity="0.4"
          className="lucky-cat-glow" />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Speech bubble
// ---------------------------------------------------------------------------
function SpeechBubble({ speaking, hasResult }: { speaking: boolean; hasResult: boolean }) {
  if (speaking) {
    return (
      <div className="cat-bubble cat-bubble--speaking" role="status" aria-live="polite">
        🔊 I'm talking...
      </div>
    );
  }
  if (!hasResult) {
    return (
      <div className="cat-bubble cat-bubble--waiting">
        💭 Give me a moment, I'm still thinking…
      </div>
    );
  }
  return (
    <div className="cat-bubble">
      🎧 Tap me — I have something to tell you!
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export interface MoneyBuddyLuckyCatProps {
  /** The latest Money Buddy insight result — null while loading. */
  insightResult: InsightResult | null;
}

export function MoneyBuddyLuckyCat({ insightResult }: MoneyBuddyLuckyCatProps) {
  const { speak, speakWithSystemVoice, stop, isSpeaking, state } = useTTS();

  const speechText =
    insightResult && !insightResult.isFallback
      ? resultToSpeechText(insightResult)
      : insightResult?.isFallback
      ? resultToSpeechText(insightResult) // fallback content is still speakable
      : "";

  const awaitingConfirmation = state.status === "awaiting-confirmation";

  function handleActivate() {
    if (awaitingConfirmation) {
      stop(); // dismiss the confirmation
      return;
    }
    if (!speechText) return;
    if (isSpeaking) {
      stop();
    } else {
      speak(speechText);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  }

  const hasResult = speechText.length > 0;
  const ariaLabel = awaitingConfirmation
    ? "Money Buddy lucky cat — voice problem, tap to dismiss"
    : isSpeaking
    ? "Money Buddy lucky cat — tap to stop"
    : hasResult
    ? "Money Buddy lucky cat — tap to hear your spending summary"
    : "Money Buddy lucky cat — still preparing your summary";

  // Fish was configured but failed: the cat tells the user why and asks
  // whether to continue with the system voice. The system voice is never
  // used silently once a key is set.
  if (awaitingConfirmation) {
    return (
      <div className="lucky-cat-card">
        <div className="cat-bubble cat-bubble--error" role="alert">
          <span className="cat-bubble-error-title">⚠️ My Fish voice ran into a problem</span>
          <span className="cat-bubble-error-detail">{state.message}</span>
          <span className="cat-bubble-confirm-q">Continue with the system voice?</span>
          <span className="cat-bubble-confirm-btns">
            <button
              type="button"
              className="cat-confirm-btn cat-confirm-btn--primary"
              onClick={() => speakWithSystemVoice(speechText)}
            >
              Use system voice
            </button>
            <button
              type="button"
              className="cat-confirm-btn"
              onClick={stop}
            >
              Not now
            </button>
          </span>
        </div>
        <button
          type="button"
          className="lucky-cat-btn"
          aria-label={ariaLabel}
          onClick={handleActivate}
          onKeyDown={handleKeyDown}
        >
          <LuckyCatSVG speaking={false} />
        </button>
      </div>
    );
  }

  return (
    <div className="lucky-cat-card">
      <SpeechBubble speaking={isSpeaking} hasResult={hasResult} />
      <button
        type="button"
        className={`lucky-cat-btn${isSpeaking ? " is-speaking" : ""}${!hasResult ? " is-waiting" : ""}`}
        aria-label={ariaLabel}
        aria-pressed={isSpeaking}
        disabled={!hasResult}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
      >
        <LuckyCatSVG speaking={isSpeaking} />
      </button>
    </div>
  );
}
