/**
 * Fish Audio TTS — via the bundled fish-tts Executa (anna.tools.invoke).
 *
 * Architecture rationale:
 *   The Executa calls api.fish.audio SERVER-SIDE, so the browser's CORS
 *   policy never applies. (Fish Audio's gateway does not answer CORS
 *   preflights — OPTIONS /v1/tts returns 404 with no
 *   Access-Control-Allow-Origin — so a browser-direct fetch can never
 *   succeed from inside the Anna iframe. Verified 2026-10-05.)
 *
 * Credential source (in priority order):
 *   1. api_key invoke arg — from VITE_FISH_AUDIO_API_KEY (local .env, dev)
 *      or Anna Storage (user-entered via Settings page)
 *   2. FISH_AUDIO_API_KEY env / executas/fish-tts/.env — read by the
 *      Executa process itself (local harness / server deployments)
 *
 * The API key never lands in the frontend bundle.
 */

import { FISH_VOICE_REFERENCE_ID, getFishTtsToolId } from "../config";
import { connectAnna } from "@/services/anna/runtime";
import { getKvStore } from "@/services/anna/storage";
import { STORAGE_KEYS } from "@/lib/constants";

/** Compact container — keeps the base64 payload small for the stdio pipe. */
const FISH_FORMAT = "opus";

export interface FishAudioResult {
  audio: ArrayBuffer;
  format: string;
}

/** Read Fish Audio API key from VITE env (dev) or Anna Storage (Settings). */
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

/** Read Fish Audio voice ID from VITE env, the compiled constant, or Anna Storage. */
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

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

interface AudioPayload {
  audio_base64: string;
  format?: string;
}

/**
 * Unwrap the Executa result. The Anna host may hand back the plugin payload
 * directly ({audio_base64, format}) or nested under data/result envelopes.
 * A {success: false, error} shape means the Executa declined the request.
 */
function extractAudioPayload(raw: unknown): AudioPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (record.success === false) return null;
  const candidates: unknown[] = [record];
  for (const key of ["data", "result", "value"]) {
    const nested = record[key];
    if (nested && typeof nested === "object") candidates.push(nested);
  }
  for (const cand of candidates) {
    const r = cand as Record<string, unknown>;
    if (typeof r.audio_base64 === "string" && r.audio_base64.length > 0) {
      return {
        audio_base64: r.audio_base64,
        format: typeof r.format === "string" ? r.format : undefined,
      };
    }
  }
  return null;
}

function describeRaw(raw: unknown): string {
  try {
    return JSON.stringify(raw).slice(0, 200);
  } catch {
    return String(raw).slice(0, 200);
  }
}

/**
 * Synthesize `text` via the fish-tts Executa and return the audio bytes.
 * Returns null when the Anna host is unavailable, the Executa declines
 * (e.g. no API key configured anywhere), or the payload is invalid.
 */
export async function fishSpeak(text: string): Promise<FishAudioResult | null> {
  if (!text.trim()) return null;

  const runtime = await connectAnna();
  const invoke = runtime.client?.tools?.invoke;
  if (runtime.state !== "connected" || typeof invoke !== "function") {
    console.warn("[TTS:fish] Anna tools.invoke unavailable (standalone mode) — skipping Fish.");
    return null;
  }

  const apiKey = await getFishApiKey();
  const voiceId = await getFishVoiceId();

  const args: Record<string, string> = { text, format: FISH_FORMAT };
  if (voiceId) args.voice_reference_id = voiceId;
  // Passed through to the Executa; it falls back to its own env/.env.
  // Never logged by either side.
  if (apiKey) args.api_key = apiKey;

  console.log(
    "[TTS:fish] invoking fish-tts Executa",
    "tool_id:", getFishTtsToolId(),
    "voice_id present:", !!voiceId,
    "api_key present:", !!apiKey,
    "text length:", text.length,
  );

  let raw: unknown;
  try {
    raw = await invoke({ tool_id: getFishTtsToolId(), method: "synthesize", args });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[TTS:fish] tools.invoke failed:", msg);
    return null;
  }

  const payload = extractAudioPayload(raw);
  if (!payload) {
    console.warn("[TTS:fish] Executa returned no audio:", describeRaw(raw));
    return null;
  }

  let buf: ArrayBuffer;
  try {
    buf = base64ToArrayBuffer(payload.audio_base64);
  } catch (err) {
    console.warn("[TTS:fish] base64 decode failed:", err instanceof Error ? err.message : err);
    return null;
  }
  console.log("[TTS:fish] audio bytes received:", buf.byteLength);

  if (buf.byteLength < 100) {
    console.warn("[TTS:fish] FISH_AUDIO_INVALID: response too small.");
    return null;
  }

  return { audio: buf, format: payload.format || FISH_FORMAT };
}

/** Whether the Fish path can be attempted (Anna host with tools.invoke). */
export async function isFishAvailable(): Promise<boolean> {
  const runtime = await connectAnna();
  return (
    runtime.state === "connected" &&
    typeof runtime.client?.tools?.invoke === "function"
  );
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
