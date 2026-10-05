import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { InsightResult } from "@/lib/aiSchema";
import { useTTS } from "@/services/tts/useTTS";
import { resultToSpeechText } from "@/services/tts/textUtils";
import { CAT_SIZE } from "./luckyCat3d/constants";
import type { LuckyCatCanvasApi } from "./luckyCat3d/LuckyCatCanvas";

// ---------------------------------------------------------------------------
// Money Buddy Lucky Cat — 3D companion (Three.js, lazy-loaded chunk).
//
// The cat is a fixed bottom-right companion like the BrightNest panda:
// it stays on screen while the page scrolls, waves its signature
// beckoning paw, and shows the idle bubble above its head 5s out of
// every 20s (same rhythm as the panda). Tap the cat to hear the AI
// spending summary (Fish TTS), tap again to stop.
// ---------------------------------------------------------------------------
const LuckyCatCanvas = lazy(() => import("./luckyCat3d/LuckyCatCanvas"));

function CatFallback() {
  return (
    <div
      className="lucky-cat-loading"
      style={{ width: CAT_SIZE, height: CAT_SIZE }}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Speech bubble (above the head)
// ---------------------------------------------------------------------------
function SpeechBubble({
  speaking,
  hasResult,
  inviteOn,
}: {
  speaking: boolean;
  hasResult: boolean;
  inviteOn: boolean;
}) {
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
  if (!inviteOn) return null;
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
  const canvasApiRef = useRef<LuckyCatCanvasApi | null>(null);
  // idle invitation bubble: visible 5s out of every 20s (panda rhythm)
  const [inviteOn, setInviteOn] = useState(true);

  const speechText =
    insightResult && !insightResult.isFallback
      ? resultToSpeechText(insightResult)
      : insightResult?.isFallback
      ? resultToSpeechText(insightResult) // fallback content is still speakable
      : "";

  const hasResult = speechText.length > 0;
  const awaitingConfirmation = state.status === "awaiting-confirmation";

  useEffect(() => {
    if (awaitingConfirmation || isSpeaking || !hasResult) {
      setInviteOn(false);
      return;
    }
    setInviteOn(true);
    const t1 = window.setTimeout(() => setInviteOn(false), 5000);
    const iv = window.setInterval(() => {
      setInviteOn(true);
      window.setTimeout(() => setInviteOn(false), 5000);
    }, 20000);
    return () => {
      window.clearTimeout(t1);
      window.clearInterval(iv);
    };
  }, [awaitingConfirmation, isSpeaking, hasResult]);

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

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  }

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
      <div className="lucky-cat-3d-wrap" role="alert">
        <div className="cat-bubble cat-bubble--error">
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
            <button type="button" className="cat-confirm-btn" onClick={stop}>
              Not now
            </button>
          </span>
        </div>
        <div
          role="button"
          tabIndex={0}
          aria-label={ariaLabel}
          onClick={handleActivate}
          onKeyDown={handleKeyDown}
          className="lucky-cat-3d-stage"
        >
          <Suspense fallback={<CatFallback />}>
            <LuckyCatCanvas ref={canvasApiRef} speaking={false} />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="lucky-cat-3d-wrap">
      <SpeechBubble speaking={isSpeaking} hasResult={hasResult} inviteOn={inviteOn} />
      <div
        role="button"
        tabIndex={hasResult ? 0 : -1}
        aria-label={ariaLabel}
        aria-pressed={isSpeaking}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
        className={`lucky-cat-3d-stage${isSpeaking ? " is-speaking" : ""}${!hasResult ? " is-waiting" : ""}`}
      >
        <Suspense fallback={<CatFallback />}>
          <LuckyCatCanvas ref={canvasApiRef} speaking={isSpeaking} />
        </Suspense>
      </div>
    </div>
  );
}
