import { Volume2, VolumeX } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

export function ReadAloudButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { speak, stop, isSpeaking, supported } = useTextToSpeech();

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`read-aloud-btn${isSpeaking ? " is-speaking" : ""}${className ? ` ${className}` : ""}`}
      aria-label={isSpeaking ? "Stop reading aloud" : "Read aloud"}
      aria-pressed={isSpeaking}
      onClick={() => (isSpeaking ? stop() : speak(text))}
    >
      {isSpeaking ? (
        <VolumeX size={14} aria-hidden="true" />
      ) : (
        <Volume2 size={14} aria-hidden="true" />
      )}
    </button>
  );
}

