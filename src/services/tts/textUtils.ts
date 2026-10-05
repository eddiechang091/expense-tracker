import type { InsightResult } from "@/lib/aiSchema";

// Emoji Unicode ranges — strip them before sending to TTS.
// Uses Unicode property escapes (ES2018+, supported by modern browsers & Node).
const EMOJI_RE =
  /[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{FE0F}\u{20E3}\u{1F3FB}-\u{1F3FF}]/gu;

const MARKDOWN_BOLD_ITALIC = /[*_]{1,2}(.+?)[*_]{1,2}/g;
const MARKDOWN_LINK = /\[([^\]]+)\]\([^)]+\)/g;
const EM_DASH_RE = /\s*—\s*/g;
const MULTI_SPACE = /  +/g;
const TRAILING_PUNCTUATION_SPACE = /([.!?])\s+/g;

/**
 * Strip emojis, markdown, and decorative punctuation from a string so it
 * reads naturally when spoken aloud by a TTS engine.
 */
export function cleanForSpeech(raw: string): string {
  return raw
    .replace(EMOJI_RE, "")
    .replace(MARKDOWN_BOLD_ITALIC, "$1")
    .replace(MARKDOWN_LINK, "$1")
    .replace(EM_DASH_RE, ". ")
    .replace(MULTI_SPACE, " ")
    .replace(TRAILING_PUNCTUATION_SPACE, "$1 ")
    .trim();
}

/**
 * Convert a structured Money Buddy InsightResult into natural spoken text.
 *
 * Rules:
 * - Only include the most conversational fields to keep audio concise.
 * - Skip fields whose cleaned text is empty or duplicates the headline.
 * - Separate sentences with a single space (TTS engines add natural pauses).
 * - Never invent text — only use what is in the result.
 * - Limit to ~160 characters to keep audio duration short and the response
 *   payload within Executa pipe limits.
 */
export function resultToSpeechText(result: InsightResult): string {
  const seen = new Set<string>();

  function add(raw: string | null | undefined): string {
    if (!raw) return "";
    const cleaned = cleanForSpeech(raw);
    if (!cleaned || seen.has(cleaned)) return "";
    seen.add(cleaned);
    return cleaned;
  }

  const parts = [
    add(result.headline),
    add(result.smallTalk),
    add(result.followUpQuestion),
  ].filter(Boolean);

  const full = parts.join(" ");
  // Keep to ~160 chars so Fish Audio audio stays small and the base64
  // response comfortably fits within the Executa pipe / harness limits.
  return full.length <= 200 ? full : full.slice(0, 197) + "…";
}
