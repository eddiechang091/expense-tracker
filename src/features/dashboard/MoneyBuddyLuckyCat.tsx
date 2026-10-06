import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { InsightResult } from "@/lib/aiSchema";
import { useTTS } from "@/services/tts/useTTS";
import { resultToSpeechText } from "@/services/tts/textUtils";
import { hasFishApiKey } from "@/services/tts/providers/fish";
import { getKvStore } from "@/services/anna/storage";
import { CAT_SIZE } from "./luckyCat3d/constants";
import type { LuckyCatCanvasApi } from "./luckyCat3d/LuckyCatCanvas";

// ---------------------------------------------------------------------------
// Money Buddy Lucky Cat — 3D companion (Three.js, lazy-loaded chunk).
//
// The cat is a draggable bottom-right companion like the BrightNest panda:
// it stays on screen while the page scrolls, waves its signature
// beckoning paw, and shows the idle bubble above its head 5s out of
// every 20s (same rhythm as the panda). Drag it anywhere — the position
// persists. Tap the cat to hear the AI spending summary (Fish TTS),
// tap again to stop.
// ---------------------------------------------------------------------------
const LuckyCatCanvas = lazy(() => import("./luckyCat3d/LuckyCatCanvas"));

const CAT_POSITION_KEY = "ui:lucky_cat_position";

interface CatPosition {
  dx: number;
  dy: number;
}

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
// Speech bubble (above the head) — rotates through invite messages.
// ---------------------------------------------------------------------------
const INVITE_MESSAGES = [
  "🎧 Tap me — I have something to tell you!",
  "🔑 Want my real voice? Add your Fish API key in Settings!",
];

function SpeechBubble({
  speaking,
  hasResult,
  inviteOn,
  inviteIndex,
  fishKeyMissing,
}: {
  speaking: boolean;
  hasResult: boolean;
  inviteOn: boolean;
  inviteIndex: number;
  fishKeyMissing: boolean;
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
  // Only show the Fish setup nudge when no key is configured; otherwise
  // always show the tap-me invite.
  const message = fishKeyMissing
    ? INVITE_MESSAGES[inviteIndex % INVITE_MESSAGES.length]
    : INVITE_MESSAGES[0];
  return <div className="cat-bubble">{message}</div>;
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
  const [inviteIndex, setInviteIndex] = useState(0);
  const [fishKeyMissing, setFishKeyMissing] = useState(false);
  // Draggable position (offset from the default bottom-right spot).
  const [pos, setPos] = useState<CatPosition>({ dx: 0, dy: 0 });
  const posRef = useRef(pos);
  posRef.current = pos;
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origDx: number;
    origDy: number;
    moved: boolean;
  } | null>(null);

  // Restore the saved position.
  useEffect(() => {
    (async () => {
      try {
        const store = await getKvStore();
        const saved = await store.get<CatPosition>(CAT_POSITION_KEY);
        if (saved && typeof saved.dx === "number" && typeof saved.dy === "number") {
          setPos({ dx: saved.dx, dy: saved.dy });
        }
      } catch {
        /* keep default */
      }
    })();
  }, []);

  // Check once whether a Fish key is configured (for the bubble nudge).
  useEffect(() => {
    let cancelled = false;
    hasFishApiKey()
      .then((has) => {
        if (!cancelled) setFishKeyMissing(!has);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
      setInviteIndex((i) => i + 1);
      setInviteOn(true);
      window.setTimeout(() => setInviteOn(false), 5000);
    }, 20000);
    return () => {
      window.clearTimeout(t1);
      window.clearInterval(iv);
    };
  }, [awaitingConfirmation, isSpeaking, hasResult]);

  // --- Drag handling -------------------------------------------------------
  // Pointer events on the stage: a press that moves < 6px is a tap
  // (toggles speech); anything more drags the cat. Position persists.
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origDx: pos.dx,
      origDy: pos.dy,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = drag.origDx + (e.clientX - drag.startX);
    const dy = drag.origDy + (e.clientY - drag.startY);
    if (Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 6) {
      drag.moved = true;
    }
    if (drag.moved) {
      // Clamp so the cat stays reachable on screen.
      const maxDx = window.innerWidth - CAT_SIZE - 36;
      const maxDy = window.innerHeight - CAT_SIZE - 36;
      setPos({
        dx: Math.min(0, Math.max(-maxDx, dx)),
        dy: Math.min(0, Math.max(-maxDy, dy)),
      });
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    try {
      e.currentTarget.releasePointerCapture(drag.pointerId);
    } catch {
      /* noop */
    }
    if (drag.moved) {
      // Persist the dropped position.
      const next = { ...posRef.current };
      getKvStore()
        .then((store) => store.set(CAT_POSITION_KEY, next))
        .catch(() => {});
    } else {
      handleActivate();
    }
  }

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
      <div
        className="lucky-cat-3d-wrap"
        role="alert"
        style={{ transform: `translate(${pos.dx}px, ${pos.dy}px)` }}
      >
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
    <div
      className="lucky-cat-3d-wrap"
      style={{ transform: `translate(${pos.dx}px, ${pos.dy}px)` }}
    >
      <SpeechBubble
        speaking={isSpeaking}
        hasResult={hasResult}
        inviteOn={inviteOn}
        inviteIndex={inviteIndex}
        fishKeyMissing={fishKeyMissing}
      />
      <div
        role="button"
        tabIndex={hasResult ? 0 : -1}
        aria-label={ariaLabel}
        aria-pressed={isSpeaking}
        onKeyDown={handleKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`lucky-cat-3d-stage lucky-cat-3d-stage--draggable${isSpeaking ? " is-speaking" : ""}${!hasResult ? " is-waiting" : ""}`}
      >
        <Suspense fallback={<CatFallback />}>
          <LuckyCatCanvas ref={canvasApiRef} speaking={isSpeaking} />
        </Suspense>
      </div>
    </div>
  );
}
