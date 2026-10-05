/**
 * Fish Audio TTS — calls api.fish.audio DIRECTLY from the browser.
 *
 * Architecture rationale:
 *   The Executa (stdout) approach is blocked by the local harness's ~64 KB
 *   internal pipe-read limit. MP3 audio base64-encoded always exceeds this.
 *   The browser fetch path avoids the Executa entirely: audio bytes stream
 *   directly from Fish Audio into the browser's memory.
 *
 * Credential source (in priority order):
 *   1. VITE_FISH_AUDIO_API_KEY  — local .env for development (never committed)
 *   2. Anna Storage key          — user-entered via Settings page
 *
 * For published apps: user enters their Fish Audio API key in Settings.
 * It is stored in Anna Storage (user-consented credential — this is their
 * own key for their own Fish Audio account, similar to how many AI apps
 * accept user-provided API keys).
 *
 * CORS: Fish Audio's api.fish.audio must allow the Anna iframe origin.
 *   If it returns CORS errors, the request fails and browser TTS is used.
 *   manifest.json declares https://api.fish.audio in external_origins.
 */

import { FISH_VOICE_REFERENCE_ID, FISH_AUDIO_FORMAT } from "../config";
import { getKvStore } from "@/services/anna/storage";
import { STORAGE_KEYS } from "@/lib/constants";

const FISH_API_ENDPOINT = "https://api.fish.audio/v1/tts";
const FISH_MODEL = "s2.1-pro-free";

/** Read Fish Audio API key from VITE env (dev) or Anna Storage (production). */
async function getFishApiKey(): Promise<string> {
  // 1. Dev: VITE_FISH_AUDIO_API_KEY in local .env (never committed)
  const viteKey = import.meta.env.VITE_FISH_AUDIO_API_KEY ?? "";
  if (viteKey.trim()) return viteKey.trim();

  // 2. Production: user-entered key stored in Anna Storage via Settings page
  try {
    const store = await getKvStore();
    const stored = await store.get<string>(STORAGE_KEYS.fishApiKey);
    return stored?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Read Fish Audio voice ID from VITE env or Anna Storage. */
async function getFishVoiceId(): Promise<string> {
  // Prefer explicit VITE override, then the compiled constant, then storage
  const viteId = import.meta.env.VITE_FISH_VOICE_REFERENCE_ID ?? "";
  if (viteId.trim()) return viteId.trim();
  if (FISH_VOICE_REFERENCE_ID.trim()) return FISH_VOICE_REFERENCE_ID.trim();
  try {
    const store = await getKvStore();
    const stored = await store.get<string>(STORAGE_KEYS.fishVoiceId);
    return stored?.trim() ?? "";
  } catch {
    return "";
  }
}

/**
 * Call Fish Audio directly from the browser and return the audio bytes.
 * Returns null if the API key is missing, CORS fails, or the request errors.
 */
export async function fishSpeak(text: string): Promise<ArrayBuffer | null> {
  if (!text.trim()) return null;

  const apiKey = await getFishApiKey();
  if (!apiKey) {
    console.warn("[TTS:fish] No Fish Audio API key. Add VITE_FISH_AUDIO_API_KEY to .env or enter it in Settings.");
    return null;
  }

  const voiceId = await getFishVoiceId();

  const body: Record<string, string> = {
    text,
    format: FISH_AUDIO_FORMAT,
  };
  if (voiceId) body.reference_id = voiceId;

  console.log(
    "[TTS:fish] calling Fish Audio directly",
    "voice_id present:", !!voiceId,
    "voice_id length:", voiceId.length,
    "text length:", text.length,
    "format:", FISH_AUDIO_FORMAT,
  );

  let resp: Response;
  try {
    resp = await fetch(FISH_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "model": FISH_MODEL,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // CORS or network error
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[TTS:fish] FISH_FETCH_FAILED:", msg);
    return null;
  }

  console.log("[TTS:fish] Fish HTTP status:", resp.status);

  if (resp.status === 401) {
    console.warn("[TTS:fish] FISH_HTTP_401: API key is invalid.");
    return null;
  }
  if (resp.status === 402) {
    console.warn("[TTS:fish] FISH_HTTP_402: Fish Audio account has no credits.");
    return null;
  }
  if (resp.status === 403) {
    console.warn("[TTS:fish] FISH_HTTP_403: access denied.");
    return null;
  }
  if (!resp.ok) {
    console.warn("[TTS:fish] FISH_HTTP_" + resp.status + ": unexpected error.");
    return null;
  }

  const buf = await resp.arrayBuffer();
  console.log("[TTS:fish] audio bytes received:", buf.byteLength);

  if (buf.byteLength < 100) {
    console.warn("[TTS:fish] FISH_AUDIO_INVALID: response too small.");
    return null;
  }

  return buf;
}

/** Whether the Fish TTS path is likely available (key exists). */
export async function isFishAvailable(): Promise<boolean> {
  const key = await getFishApiKey();
  return key.length > 0;
}

/** Save the Fish Audio API key to Anna Storage (user-entered credential). */
export async function saveFishApiKey(key: string): Promise<void> {
  const store = await getKvStore();
  if (key.trim()) {
    await store.set(STORAGE_KEYS.fishApiKey, key.trim());
  } else {
    await store.remove(STORAGE_KEYS.fishApiKey);
  }
}

/** Save the Fish Audio voice reference ID to Anna Storage. */
export async function saveFishVoiceId(id: string): Promise<void> {
  const store = await getKvStore();
  if (id.trim()) {
    await store.set(STORAGE_KEYS.fishVoiceId, id.trim());
  } else {
    await store.remove(STORAGE_KEYS.fishVoiceId);
  }
}

