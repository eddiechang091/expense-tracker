import { fishSpeak } from "./providers/fish";

export type TTSProvider = "fish" | null;

export type TTSState =
  | { status: "idle"; provider: null }
  | { status: "loading"; provider: null }
  | { status: "speaking"; provider: TTSProvider }
  | { status: "stopped"; provider: null }
  | { status: "error"; provider: null; message: string };

export type TTSStateListener = (state: TTSState) => void;

// ---------------------------------------------------------------------------
// Active playback tracking
// ---------------------------------------------------------------------------
let activeAudioEl: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let activeListeners: Set<TTSStateListener> = new Set();
// Modules that mount a useTTS hook stay in sync even when speak() is
// invoked with a different caller's listener set.
const globalListeners: Set<TTSStateListener> = new Set();
// Epoch invalidates in-flight speak() work after stopAll() so a stale
// audio.onerror / fishSpeak resolution can never start fallback speech.
let epoch = 0;

function revokeObjectUrl() {
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

function broadcast(state: TTSState) {
  for (const l of globalListeners) {
    try {
      l(state);
    } catch {
      /* ignore listener errors */
    }
  }
  for (const l of activeListeners) {
    if (!globalListeners.has(l)) {
      try {
        l(state);
      } catch {
        /* ignore listener errors */
      }
    }
  }
}

/** Stop all active playback (Fish audio element + browser speech). */
export function stopAll() {
  epoch += 1;
  broadcast({ status: "stopped", provider: null });
  if (activeAudioEl) {
    // Detach callbacks BEFORE pausing: pausing/clearing src fires an
    // error event on some browsers, which must not trigger browser fallback.
    activeAudioEl.onended = null;
    activeAudioEl.onerror = null;
    activeAudioEl.pause();
    try {
      activeAudioEl.removeAttribute("src");
      activeAudioEl.load();
    } catch {
      /* ignore — defensive teardown */
    }
    activeAudioEl = null;
  }
  revokeObjectUrl();
}

/** Register a hook instance so UI state stays in sync across callers. */
export function subscribe(listener: TTSStateListener): () => void {
  globalListeners.add(listener);
  return () => {
    globalListeners.delete(listener);
  };
}

/**
 * Speak `text` using Fish Audio (via Executa) with browser SpeechSynthesis
 * as automatic fallback.
 *
 * Flow:
 *   1. stop any current playback
 *   2. try Fish Audio → play ArrayBuffer via HTMLAudioElement
 *   3. if Fish fails/unavailable → try browser SpeechSynthesis
 *   4. if both fail → emit error state
 */
export async function speak(
  text: string,
  listeners: Set<TTSStateListener>
): Promise<void> {
  activeListeners = listeners;
  stopAll();
  // stopAll() bumped the epoch; re-anchor so THIS speak's own async
  // continuations below are the valid generation.
  const current = epoch;
  if (!text.trim()) return;

  broadcast({ status: "loading", provider: null });

  // --- Attempt Fish Audio ---
  let fishBuf: ArrayBuffer | null = null;
  try {
    fishBuf = await fishSpeak(text);
  } catch (err) {
    console.warn("[TTS] fishSpeak threw unexpectedly:", err);
    fishBuf = null;
  }

  if (!fishBuf) {
    console.log("[TTS] Fish unavailable or failed — no fallback (Fish-only mode)");
    broadcast({ status: "error", provider: null, message: "Voice isn't available right now. Add your Fish Audio key in Settings." });
    return;
  }

  if (current !== epoch) return; // stopped while Fish was synthesizing

  const blob = new Blob([fishBuf], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  activeObjectUrl = url;

  const audio = new Audio(url);
  activeAudioEl = audio;

  audio.onended = () => {
    if (current !== epoch) return;
    if (activeAudioEl === audio) {
      activeAudioEl = null;
      revokeObjectUrl();
      broadcast({ status: "idle", provider: null });
    }
  };
  audio.onerror = (ev) => {
    if (current !== epoch) return;
    if (activeAudioEl === audio) {
      activeAudioEl = null;
      revokeObjectUrl();
      const errCode = (audio.error?.code ?? "?") + " " + (audio.error?.message ?? "");
      console.warn("[TTS] Fish audio element error:", errCode, ev);
      broadcast({ status: "error", provider: null, message: "Audio playback failed." });
    }
  };

  try {
    await audio.play();
    if (current !== epoch) {
      audio.onended = null;
      audio.onerror = null;
      try { audio.pause(); } catch { /* ignore */ }
      return;
    }
    broadcast({ status: "speaking", provider: "fish" });
  } catch (playErr) {
    const errName = playErr instanceof Error ? playErr.name : String(playErr);
    console.warn("[TTS] Fish audio.play() failed:", errName, playErr);
    activeAudioEl = null;
    revokeObjectUrl();
    broadcast({ status: "error", provider: null, message: "Audio playback was blocked. Try interacting with the page first." });
  }
}

/** Whether TTS is likely available (returns true optimistically; actual Fish API key check is async). */
export function isTTSSupported(): boolean {
  // Return true to show the Lucky Cat — isFishAvailable() is async and
  // checked when the user actually taps. If no key is configured the cat
  // will show an error bubble instead of speaking.
  return true;
}
