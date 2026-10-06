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

export type FishErrorCode =
  | "NO_HOST" // Anna tools.invoke unavailable (standalone mode)
  | "NOT_CONFIGURED" // no API key anywhere (Executa env/.env or invoke arg)
  | "INVALID_KEY" // Fish HTTP 401
  | "NO_CREDITS" // Fish HTTP 402
  | "FORBIDDEN" // Fish HTTP 403
  | "BAD_REQUEST" // Fish HTTP 422 (often a bad voice reference ID)
  | "RATE_LIMITED" // Fish HTTP 429
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_AUDIO"
  | "TRANSPORT_ERROR"; // tools.invoke itself failed

export type FishSpeakResult =
  | { ok: true; audio: ArrayBuffer; format: string }
  | { ok: false; code: FishErrorCode; message: string };

/** User-facing message for a Fish failure (shown in the Lucky Cat bubble). */
function userMessageFor(code: FishErrorCode, detail: string): string {
  switch (code) {
    case "NOT_CONFIGURED":
      return "No Fish Audio API key is configured.";
    case "INVALID_KEY":
      return "The Fish Audio API key is invalid. Please check it in Settings.";
    case "NO_CREDITS":
      return "The Fish Audio account has run out of credits.";
    case "FORBIDDEN":
      return "Fish Audio denied access (403).";
    case "BAD_REQUEST":
      return "Fish Audio rejected the request — the voice reference ID may be invalid.";
    case "RATE_LIMITED":
      return "Fish Audio rate limit reached. Try again in a moment.";
    case "TIMEOUT":
      return "Fish Audio timed out.";
    case "NETWORK_ERROR":
      return "Could not reach Fish Audio (network error).";
    case "INVALID_AUDIO":
      return "Fish Audio returned invalid audio.";
    case "TRANSPORT_ERROR":
      return "Could not reach the voice service.";
    case "NO_HOST":
      return "Voice service is unavailable.";
    default:
      return detail || "Fish Audio failed.";
  }
}

/** Map an Executa "FISH_*" error string to a FishErrorCode. */
function codeForExecutaError(error: string): FishErrorCode {
  if (error.startsWith("FISH_NOT_CONFIGURED")) return "NOT_CONFIGURED";
  if (error.startsWith("FISH_HTTP_401")) return "INVALID_KEY";
  if (error.startsWith("FISH_HTTP_402")) return "NO_CREDITS";
  if (error.startsWith("FISH_HTTP_403")) return "FORBIDDEN";
  if (error.startsWith("FISH_HTTP_422")) return "BAD_REQUEST";
  if (error.startsWith("FISH_HTTP_429")) return "RATE_LIMITED";
  if (error.startsWith("FISH_TIMEOUT")) return "TIMEOUT";
  if (error.startsWith("FISH_REQUEST_FAILED")) return "NETWORK_ERROR";
  if (error.startsWith("FISH_AUDIO_INVALID")) return "INVALID_AUDIO";
  return "TRANSPORT_ERROR";
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

interface FishHealth {
  configured: boolean;
}

/**
 * Unwrap a host result that may be the payload directly or nested under
 * data/result/value envelopes.
 */
function unwrapToRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const candidates = [record, record.data, record.result, record.value];
  for (const cand of candidates) {
    if (cand && typeof cand === "object" && !Array.isArray(cand)) {
      return cand as Record<string, unknown>;
    }
  }
  return null;
}

type InvokeFn = (input: {
  tool_id: string;
  method: string;
  args?: unknown;
}) => Promise<unknown>;

/**
 * Ask the Executa whether it already has an API key (env/.env).
 * Used to decide whether the user's Settings key must be forwarded:
 * the secret stays out of the harness RPC log whenever a server-side
 * key exists. Returns null when the check itself fails (safe default:
 * forward the key).
 */
async function getFishHealth(invoke: InvokeFn, toolId: string): Promise<FishHealth | null> {
  try {
    const raw = await invoke({ tool_id: toolId, method: "health", args: {} });
    const record = unwrapToRecord(raw);
    if (record && typeof record.fish_configured === "boolean") {
      return { configured: record.fish_configured };
    }
    return null;
  } catch {
    return null;
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
  total_chunks?: number;
  chunk_index?: number;
  token?: string;
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
      const payload: AudioPayload = {
        audio_base64: r.audio_base64,
      };
      if (typeof r.format === "string") payload.format = r.format;
      if (typeof r.total_chunks === "number") payload.total_chunks = r.total_chunks;
      if (typeof r.chunk_index === "number") payload.chunk_index = r.chunk_index;
      if (typeof r.token === "string") payload.token = r.token;
      return payload;
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
 * Never throws for expected failures: they come back as {ok: false} with a
 * machine-readable code and a user-facing message.
 */
export async function fishSpeak(text: string): Promise<FishSpeakResult> {
  if (!text.trim()) {
    return { ok: false, code: "BAD_REQUEST", message: userMessageFor("BAD_REQUEST", "") };
  }

  const runtime = await connectAnna();
  const invoke = runtime.client?.tools?.invoke;
  if (runtime.state !== "connected" || typeof invoke !== "function") {
    console.warn("[TTS:fish] Anna tools.invoke unavailable (standalone mode) — skipping Fish.");
    return { ok: false, code: "NO_HOST", message: userMessageFor("NO_HOST", "") };
  }

  const apiKey = await getFishApiKey();
  const voiceId = await getFishVoiceId();
  const toolId = getFishTtsToolId();

  // Only forward the user's Settings key when the Executa doesn't already
  // have one (env/.env): the secret then stays out of the harness RPC log.
  // When the health check itself fails, forward it (safe default).
  const health = await getFishHealth(invoke, toolId);

  const args: Record<string, string> = { text, format: FISH_FORMAT };
  if (voiceId) args.voice_reference_id = voiceId;
  // Passed through to the Executa; it falls back to its own env/.env.
  // Never logged by either side.
  if (apiKey && health?.configured !== true) args.api_key = apiKey;

  console.log(
    "[TTS:fish] invoking fish-tts Executa",
    "tool_id:", toolId,
    "voice_id present:", !!voiceId,
    "api_key forwarded:", !!args.api_key,
    "executa key configured:", health?.configured ?? "unknown",
    "text length:", text.length,
  );

  let raw: unknown;
  try {
    raw = await invoke({ tool_id: toolId, method: "synthesize", args });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[TTS:fish] tools.invoke failed:", msg);
    return { ok: false, code: "TRANSPORT_ERROR", message: userMessageFor("TRANSPORT_ERROR", msg) };
  }

  // The Executa reports its own failures as {success: false, error}.
  if (raw && typeof raw === "object" && (raw as Record<string, unknown>).success === false) {
    const detail = String((raw as Record<string, unknown>).error ?? "");
    const code = codeForExecutaError(detail);
    console.warn("[TTS:fish] Executa reported failure:", detail.slice(0, 200));
    return { ok: false, code, message: userMessageFor(code, detail) };
  }

  const payload = extractAudioPayload(raw);
  if (!payload) {
    console.warn("[TTS:fish] Executa returned no audio:", describeRaw(raw));
    return { ok: false, code: "INVALID_AUDIO", message: userMessageFor("INVALID_AUDIO", "") };
  }

  // Chunked transfer: the harness cannot reliably read a single stdout
  // JSON line much larger than ~64 KB, so the Executa splits big audio
  // into numbered chunks. Fetch the rest and reassemble.
  let fullB64 = payload.audio_base64;
  const totalChunks =
    typeof payload.total_chunks === "number" ? payload.total_chunks : 1;
  if (totalChunks > 1) {
    if (!payload.token) {
      console.warn("[TTS:fish] chunked response without token");
      return { ok: false, code: "INVALID_AUDIO", message: userMessageFor("INVALID_AUDIO", "") };
    }
    console.log(`[TTS:fish] fetching ${totalChunks - 1} more chunk(s)`);
    const parts = [fullB64];
    for (let i = 1; i < totalChunks; i++) {
      let chunkRaw: unknown;
      try {
        chunkRaw = await invoke({
          tool_id: toolId,
          method: "get_chunk",
          args: { token: payload.token, chunk_index: i },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[TTS:fish] get_chunk ${i} failed:`, msg);
        return { ok: false, code: "TRANSPORT_ERROR", message: userMessageFor("TRANSPORT_ERROR", msg) };
      }
      if (
        chunkRaw &&
        typeof chunkRaw === "object" &&
        (chunkRaw as Record<string, unknown>).success === false
      ) {
        const detail = String((chunkRaw as Record<string, unknown>).error ?? "");
        console.warn(`[TTS:fish] get_chunk ${i} reported failure:`, detail.slice(0, 200));
        return { ok: false, code: "TRANSPORT_ERROR", message: userMessageFor("TRANSPORT_ERROR", detail) };
      }
      const chunkPayload = extractAudioPayload(chunkRaw);
      if (!chunkPayload) {
        console.warn(`[TTS:fish] get_chunk ${i} returned no audio`);
        return { ok: false, code: "INVALID_AUDIO", message: userMessageFor("INVALID_AUDIO", "") };
      }
      parts.push(chunkPayload.audio_base64);
    }
    fullB64 = parts.join("");
    console.log("[TTS:fish] reassembled", parts.length, "chunks,", fullB64.length, "b64 chars");
  }

  let buf: ArrayBuffer;
  try {
    buf = base64ToArrayBuffer(fullB64);
  } catch (err) {
    console.warn("[TTS:fish] base64 decode failed:", err instanceof Error ? err.message : err);
    return { ok: false, code: "INVALID_AUDIO", message: userMessageFor("INVALID_AUDIO", "") };
  }
  console.log("[TTS:fish] audio bytes received:", buf.byteLength);

  if (buf.byteLength < 100) {
    console.warn("[TTS:fish] FISH_AUDIO_INVALID: response too small.");
    return { ok: false, code: "INVALID_AUDIO", message: userMessageFor("INVALID_AUDIO", "") };
  }

  return { ok: true, audio: buf, format: payload.format || FISH_FORMAT };
}

/** Whether the Fish path can be attempted (Anna host with tools.invoke). */
export async function isFishAvailable(): Promise<boolean> {
  const runtime = await connectAnna();
  return (
    runtime.state === "connected" &&
    typeof runtime.client?.tools?.invoke === "function"
  );
}

/**
 * True when a Fish Audio API key is configured (Vite env or Anna Storage).
 * Used by the UI to decide whether to nudge the user to set one up.
 * Does not reveal the key itself.
 */
export async function hasFishApiKey(): Promise<boolean> {
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
