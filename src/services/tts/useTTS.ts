import { useState, useCallback, useEffect } from "react";
import {
  speak,
  speakBrowserVoice,
  stopAll,
  subscribe,
  isTTSSupported,
  type TTSState,
  type TTSStateListener,
} from "./index";

export type { TTSState };

export interface TTSControls {
  /** Start speaking; cancels any current playback first. */
  speak: (text: string) => void;
  /** Speak via the system voice (used after the user confirms the fallback). */
  speakWithSystemVoice: (text: string) => void;
  /** Stop all current playback. */
  stop: () => void;
  state: TTSState;
  /** True while loading or speaking. */
  isSpeaking: boolean;
  /** False when neither Fish nor browser TTS is available. */
  supported: boolean;
}

export function useTTS(): TTSControls {
  const [state, setState] = useState<TTSState>({ status: "idle", provider: null });
  const [speakListeners] = useState(() => new Set<TTSStateListener>());

  // Register this hook instance globally so every mounted hook follows the
  // shared TTS state even when speak() is invoked by another caller.
  useEffect(() => {
    const listener: TTSStateListener = (s) => setState(s);
    return subscribe(listener);
  }, []);

  const startSpeaking = useCallback(
    (text: string) => {
      void speak(text, speakListeners);
    },
    [speakListeners]
  );

  const stop = useCallback(() => {
    stopAll();
  }, []);

  const speakWithSystemVoice = useCallback(
    (text: string) => {
      speakBrowserVoice(text, speakListeners);
    },
    [speakListeners]
  );

  const isSpeaking = state.status === "speaking" || state.status === "loading";

  return {
    speak: startSpeaking,
    speakWithSystemVoice,
    stop,
    state,
    isSpeaking,
    supported: isTTSSupported(),
  };
}
