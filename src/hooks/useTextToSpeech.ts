import { useState, useCallback, useRef, useEffect } from "react";

export interface TextToSpeechControls {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  supported: boolean;
}

// Module-level reference to the active state setter so clicking Read Aloud
// on any new message automatically restores the button on the previous one.
let activeSetter: ((speaking: boolean) => void) | null = null;

function clearActiveSpeaker() {
  if (activeSetter) {
    activeSetter(false);
    activeSetter = null;
  }
}

export function useTextToSpeech(): TextToSpeechControls {
  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined";

  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (activeSetter === setIsSpeaking) activeSetter = null;
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;

      // Stop any other instance that is currently speaking.
      clearActiveSpeaker();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      activeSetter = setIsSpeaking;

      const onDone = () => {
        if (utteranceRef.current === utterance) {
          setIsSpeaking(false);
          utteranceRef.current = null;
          if (activeSetter === setIsSpeaking) activeSetter = null;
        }
      };
      utterance.onend = onDone;
      utterance.onerror = onDone;

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  // Cancel and clean up when the component using this hook unmounts.
  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
      }
      if (activeSetter === setIsSpeaking) {
        if (supported) window.speechSynthesis.cancel();
        activeSetter = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { speak, stop, isSpeaking, supported };
}
