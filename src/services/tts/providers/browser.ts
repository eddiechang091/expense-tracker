// Thin wrapper around window.speechSynthesis that matches the cancellation
// pattern needed by TTSService.
//
// Default voice policy ("soft female voice"): Money Buddy speaks through the
// system voice when no Fish Audio key is configured, so it must sound decent
// with zero setup. We prefer an English female voice and soften the delivery
// slightly (a touch slower, a touch higher) for a gentler feel.

/** Name fragments that strongly suggest a female voice. */
const FEMALE_VOICE_HINTS = [
  "female",
  "woman",
  "girl",
  "samantha",
  "victoria",
  "karen",
  "moira",
  "tessa",
  "fiona",
  "zira",
  "aria",
  "jenny",
  "sonia",
  "susan",
  "linda",
  "heather",
  "kathy",
  "eva",
  "emma",
];

export function isBrowserTTSSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

/**
 * Pick the default system voice: an English female voice when one is
 * available, otherwise the best English voice, otherwise any voice.
 * Returns null when no voices are loaded yet (caller falls back to the
 * browser default) or TTS is unsupported.
 */
export function pickDefaultVoice(): SpeechSynthesisVoice | null {
  if (!isBrowserTTSSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const lower = (s: string) => s.toLowerCase();
  const isEn = (v: SpeechSynthesisVoice) => lower(v.lang).startsWith("en");
  const looksFemale = (v: SpeechSynthesisVoice) =>
    FEMALE_VOICE_HINTS.some((h) => lower(v.name).includes(h));
  return (
    voices.find((v) => isEn(v) && looksFemale(v)) ??
    voices.find((v) => isEn(v) && lower(v.name).includes("google")) ??
    voices.find(isEn) ??
    voices.find(looksFemale) ??
    voices[0] ??
    null
  );
}

// Warm the voice list: getVoices() is empty until the voiceschanged event
// fires in some browsers. Warming here means a later tap can pick the
// preferred voice instead of the browser default.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      window.speechSynthesis.getVoices();
    });
  } catch {
    /* ignore — voice selection degrades to browser default */
  }
}

/**
 * Start browser speech synthesis for the given text.
 * Returns a cleanup function that cancels the utterance if called.
 * Calls `onEnd` when speech completes, is cancelled, or errors.
 */
export function browserSpeak(
  text: string,
  onEnd: () => void
): (() => void) | null {
  if (!isBrowserTTSSupported() || !text.trim()) return null;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Default "soft female voice": prefer an English female system voice and
  // soften delivery slightly. Falls back to the browser default voice when
  // the voice list isn't loaded yet.
  const voice = pickDefaultVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "en-US";
  }
  utterance.rate = 0.95;
  utterance.pitch = 1.05;

  let finished = false;
  const finish = () => {
    if (!finished) {
      finished = true;
      onEnd();
    }
  };
  utterance.onend = finish;
  utterance.onerror = finish;

  window.speechSynthesis.speak(utterance);

  return () => {
    utterance.onend = null;
    utterance.onerror = null;
    window.speechSynthesis.cancel();
    finish();
  };
}
