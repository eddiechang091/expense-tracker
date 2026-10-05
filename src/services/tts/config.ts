// ---------------------------------------------------------------------------
// TTS Configuration
//
// HOW TO CONFIGURE:
//
// 1. Fish Audio voice:
//    Set FISH_VOICE_REFERENCE_ID in executas/fish-tts/.env
//    (the .env is read by the Executa Python process, never by the browser)
//
// 2. Fish Audio API key:
//    Set FISH_AUDIO_API_KEY in executas/fish-tts/.env or as an environment
//    variable before starting `anna-app dev`.
//    NEVER put the API key in this file or anywhere in the frontend bundle.
//
// 3. Fish model:
//    FISH_MODEL in the Executa env (defaults to "s2.1-pro-free").
//
// This file only exposes the VOICE REFERENCE ID to the UI so it can be sent
// to the Executa. The actual API key lives exclusively in the Executa process.
// ---------------------------------------------------------------------------

/** Anna tool handle for the Fish TTS Executa (declared in app.json). */
export const FISH_TTS_TOOL_HANDLE = "fish-tts";

/**
 * Resolve the tool ID from the Anna-generated sidecar (bundle/anna-tool-ids.js)
 * at runtime. Falls back to a development placeholder when running outside
 * the Anna harness.
 */
export function getFishTtsToolId(): string {
  const ids = (window as unknown as { __ANNA_TOOL_IDS__?: Record<string, string> })
    .__ANNA_TOOL_IDS__;
  return ids?.[FISH_TTS_TOOL_HANDLE] ?? "tool-dev-fish-tts";
}

/**
 * Fish Audio voice reference ID to use for Money Buddy's voice.
 *
 * Set VITE_FISH_VOICE_REFERENCE_ID in your local .env to override.
 * If not set, the Executa will use its default/configured voice.
 *
 * IMPORTANT: This is NOT a secret — it is the public voice ID that tells
 * Fish Audio which voice profile to use, similar to a preset name.
 * The actual API key never leaves the Executa process.
 */
export const FISH_VOICE_REFERENCE_ID: string =
  import.meta.env.VITE_FISH_VOICE_REFERENCE_ID ?? "";

/** Fish Audio output format. MP3 is universally supported in browsers
 * and is the safest choice for HTMLAudioElement playback in iframes.
 */
export const FISH_AUDIO_FORMAT = "mp3" as const;
