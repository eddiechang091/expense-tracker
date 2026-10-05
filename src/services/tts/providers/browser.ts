// Thin wrapper around window.speechSynthesis that matches the cancellation
// pattern needed by TTSService.

export function isBrowserTTSSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
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
