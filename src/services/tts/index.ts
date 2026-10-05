import { fishSpeak, isFishAvailable, type FishAudioResult } from "./providers/fish";
import {
  browserSpeak,
  isBrowserTTSSupported,
} from "./providers/browser";

export type TTSProvider = "fish" | "browser" | null;

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
/** Cleanup for an in-flight browser SpeechSynthesis utterance. */
let activeBrowserCleanup: (() => void) | null = null;
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

function cancelBrowserSpeech() {
  if (activeBrowserCleanup) {
    try {
      activeBrowserCleanup();
    } catch {
      /* ignore — defensive teardown */
    }
    activeBrowserCleanup = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

/** Stop all active playback (Fish audio element + browser speech). */
export function stopAll() {
  epoch += 1;
  broadcast({ status: "stopped", provider: null });
  cancelBrowserSpeech();
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

function mimeForFormat(format: string): string {
  // Opus arrives in an Ogg container from the Executa; MP3 otherwise.
  return format === "opus" ? "audio/ogg; codecs=opus" : "audio/mpeg";
}

/** Play Fish audio bytes through an HTMLAudioElement. */
async function playFishAudio(
  fish: FishAudioResult,
  current: number
): Promise<boolean> {
  const blob = new Blob([fish.audio], { type: mimeForFormat(fish.format) });
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
  audio.onerror = () => {
    if (current !== epoch) return;
    if (activeAudioEl === audio) {
      activeAudioEl = null;
      revokeObjectUrl();
      const errCode = (audio.error?.code ?? "?") + " " + (audio.error?.message ?? "");
      console.warn("[TTS] Fish audio element error:", errCode);
      // Element-level failure falls through to the browser voice below.
      broadcast({ status: "loading", provider: null });
    }
  };

  try {
    await audio.play();
  } catch (playErr) {
    const errName = playErr instanceof Error ? playErr.name : String(playErr);
    console.warn("[TTS] Fish audio.play() failed:", errName, playErr);
    activeAudioEl = null;
    revokeObjectUrl();
    return false;
  }
  if (current !== epoch) {
    audio.onended = null;
    audio.onerror = null;
    try {
      audio.pause();
    } catch {
      /* ignore */
    }
    return false;
  }
  broadcast({ status: "speaking", provider: "fish" });
  return true;
}

/**
 * Speak `text` using Fish Audio (via the fish-tts Executa) with the system
 * voice as the automatic default/fallback.
 *
 * Flow:
 *   1. stop any current playback
 *   2. try Fish Audio when the Anna host exposes tools.invoke
 *   3. if Fish is unavailable or fails → browser SpeechSynthesis
 *      (soft-female default voice, zero configuration needed)
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

  // --- Attempt Fish Audio (Executa, server-side: no CORS involved) ---
  let fish: FishAudioResult | null = null;
  try {
    if (await isFishAvailable()) {
      fish = await fishSpeak(text);
    }
  } catch (err) {
    console.warn("[TTS] fishSpeak threw unexpectedly:", err);
    fish = null;
  }

  if (fish) {
    if (current !== epoch) return; // stopped while Fish was synthesizing
    const played = await playFishAudio(fish, current);
    if (played) return;
    // Audio element failed — fall through to the browser voice.
    if (current !== epoch) return;
    console.log("[TTS] Fish playback failed — falling back to browser voice");
  } else {
    console.log("[TTS] Fish unavailable — using browser voice (default)");
  }

  // --- Browser SpeechSynthesis: the zero-config default voice ---
  if (current !== epoch) return;
  if (!isBrowserTTSSupported()) {
    broadcast({
      status: "error",
      provider: null,
      message: "Voice isn't available right now.",
    });
    return;
  }

  const cleanup = browserSpeak(text, () => {
    if (current !== epoch) return;
    activeBrowserCleanup = null;
    broadcast({ status: "idle", provider: null });
  });
  if (!cleanup) {
    broadcast({
      status: "error",
      provider: null,
      message: "Voice isn't available right now.",
    });
    return;
  }
  activeBrowserCleanup = cleanup;
  broadcast({ status: "speaking", provider: "browser" });
}

/** Whether TTS is likely available (sync browser check; Fish is async). */
export function isTTSSupported(): boolean {
  // Browser SpeechSynthesis is the zero-config default voice, so its
  // presence decides support. The Fish path is probed asynchronously when
  // the user actually taps (isFishAvailable).
  return isBrowserTTSSupported();
}
