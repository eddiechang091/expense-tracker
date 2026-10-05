# WORKING-TRACK.md — expense-tracker (Money Companion)

Every change to this repo is recorded here with a timestamp (user git-workflow rule, 2026-09-26).
Newest entries first. Times in America/Halifax.

---

## 2026-10-05 14:05 — PR #11 MERGED, PR #10 MERGED (main at a8cd754)

User merged both. Local main fast-forwarded to `a8cd754`; local branches
deleted. Next: user restarts the harness (Executa respawns with chunking
+ health-gated key forwarding) and re-tests the Lucky Cat voice.

---

## 2026-10-05 13:20 — fix/tts-chunked-audio-transfer → PR #11 (open, awaiting review)

**User report.** Executa installed and Fish API returns HTTP 200 with
100862 bytes of audio, yet the harness reports `tool_failed: executa
process exited` ~8s after invoke — Lucky Cat still falls back to system
voice.

**Root cause.** The harness cannot reliably read a single stdout JSON
line much larger than ~64 KB (empirically: ~41 KB response fine, ~135 KB
base64 response kills the process). This is the same pipe-read limit
that motivated the (broken) browser-direct pivot in Phase 6.5.

**Fix (2 atomic commits on branch `fix/tts-chunked-audio-transfer`):**

- `executas/fish-tts/main.py`: `synthesize()` splits base64 audio over
  48K chars into numbered chunks served via a new `get_chunk` method
  (token-based sessions, bounded to 8, freed after the last chunk).
  Small audio stays single-chunk, backward compatible. Manifest updated.
- `providers/fish.ts`: `fishSpeak()` fetches remaining chunks when
  `total_chunks > 1` and reassembles before decoding. Each JSON line stays
  ~50 KB.

**Verification:** chunking round-trip tested locally in Python
(134484 chars → 3 chunks → byte-identical reassembly; max JSON line
~49 KB); `vitest` 196/196, `tsc` clean, `vite build` clean.

**Note for the user:** the Executa is installed editable (`pip install -e`),
so pulling this change updates the running code — but the harness must be
restarted to respawn the process.

---

## 2026-10-05 13:05 — fix/tts-minimize-key-exposure → PR #10 (MERGED 14:02)

**User question.** After revoking a key that had appeared in plaintext in a
pasted harness RPC log: is something wrong with encryption?

**Answer.** No encryption bug: the HTTPS call to Fish Audio is TLS-encrypted.
The plaintext appearance is because the frontend forwards the Settings API
key as a `tools.invoke` arg, and the harness RPC log records full args
without redaction. That forwarding was introduced in PR #8 to make the
Settings key work; this change tightens it.

**Fix (2 atomic commits on branch `fix/tts-minimize-key-exposure`):**

- `fish.ts`: `fishSpeak()` now calls the Executa `health` method first; the
  Settings key is forwarded only when the Executa reports no server-side
  key (`fish_configured: false`) or when the health check itself fails
  (safe default). A server-side key therefore never traverses RPC/logs.
- `SettingsPage.tsx`: honest copy — the old "never leaves your device"
  claim was wrong; the new copy states when the key is forwarded and warns
  it can appear in the local harness RPC log.

**Verification:** `vitest` 196/196, `tsc --noEmit` clean, `vite build` clean.

---

## 2026-10-05 12:45 — fix/tts-fish-failure-confirmation → PR #9 (open, awaiting review)

**User report.** API key is set and saved in Settings, but the Lucky Cat
still used the system voice. User requirement: when a key is configured,
Fish must be the only path — never fall back to system silently. If the
key or voice ID is bad, the cat itself must tell the user, then pop a
bubble asking whether to continue with the system voice.

**Fix (6 atomic commits on branch `fix/tts-fish-failure-confirmation`):**

- `2413961` refactor(tts): fishSpeak returns a discriminated FishSpeakResult —
  `{ok: true, audio, format}` or `{ok: false, code, message}` with a
  FishErrorCode (INVALID_KEY, NO_CREDITS, BAD_REQUEST, …) and a user-facing
  message, instead of null.
- `36907ba` feat(tts): ask before falling back when configured Fish fails —
  new `speak()` policy: Fish attempted whenever the host exposes
  tools.invoke; NOT_CONFIGURED → system voice directly (zero-config
  default); any other Fish failure → broadcast `awaiting-confirmation`
  with the reason. New `speakBrowserVoice()` for the confirmed path.
- `082864f` feat(tts): expose speakWithSystemVoice on the useTTS hook.
- `7da7f61` feat(ui): Lucky Cat asks before using the system voice —
  error bubble shows the failure reason + "Use system voice" / "Not now"
  buttons; tapping the cat dismisses. New `.cat-bubble--error` styles.
- `66bd71d` test(tts): update fishSpeak expectation for FishSpeakResult.
- (this doc) working-track entry.

**Behavior now:**
- No key anywhere → system voice directly (unchanged default).
- Key set + Fish works → Fish voice, never system.
- Key set + Fish fails (bad key/voice, no credits, …) → cat bubble shows
  the reason and asks "Continue with the system voice?" — system voice
  only starts after the user taps "Use system voice".

**Verification:** `vitest` 196/196, `tsc --noEmit` clean, `vite build` clean.

**Note:** `scripts/fish-e2e-smoke.mjs` step 15 ("force Fish failure →
automatic browser fallback") no longer matches the product behavior —
the script needs updating to click through the confirmation bubble.

---

## 2026-10-05 12:25 — fix/tts-default-system-voice → PR #8 (open, awaiting review)

**Problem.** After the Phase 6.5 refactor, Money Buddy's Lucky Cat produced no
sound at all. Root causes found by E2E investigation (2026-10-05):

1. **CORS (concrete defect).** The refactor switched Fish TTS to a
   browser-direct `fetch("https://api.fish.audio/v1/tts")`. Fish Audio's
   gateway does not answer CORS preflights — `OPTIONS /v1/tts` returns 404
   with no `Access-Control-Allow-Origin` (verified via curl). The browser
   therefore blocks every request. Server-side calls (curl / Python /
   Executa) are unaffected by CORS, which is why "the API call succeeded"
   while the page stayed silent.
2. **No zero-config voice.** The refactor also made TTS Fish-only: with no
   API key reachable from inside Anna, the Lucky Cat showed an error bubble
   instead of speaking. (Also confirmed: the shipped bundle contained zero
   `speechSynthesis` references, so the earlier "system voice" report came
   from a stale pre-refactor bundle.)

**Fix (4 atomic commits on branch `fix/tts-default-system-voice`):**

- `f38fc35` fix(tts): route Fish Audio through the fish-tts Executa —
  `providers/fish.ts` calls the bundled Executa via `anna.tools.invoke`
  (server-side, no CORS). API key forwarded as invoke arg (VITE env or Anna
  Storage via Settings) with fallback to the Executa's own env/.env; voice
  reference ID forwarded the same way. Returns `{audio, format}`.
- `1a5f9eb` feat(tts): default to a soft female system voice —
  `providers/browser.ts` gains `pickDefaultVoice()` (English female voice
  preferred by name heuristic, gentle prosody: rate 0.95, pitch 1.05).
- `e796b37` feat(tts): Fish-first with system-voice fallback orchestration —
  `index.ts` tries Fish, falls back to browser SpeechSynthesis; `stopAll()`
  cancels browser speech too; Blob MIME follows format (opus → audio/ogg);
  `isTTSSupported()` is a sync browser check again; `TTSProvider` gains
  `"browser"`.
- `4a33872` feat(fish-tts): accept api_key as an invoke arg —
  `executas/fish-tts/fish_tts/main.py` prefers the arg, falls back to
  env/.env; logs fingerprint + source only, never the value.

**Verification:** `vitest` 196/196 pass (incl. the previously stale
`isTTSSupported` expectation), `tsc --noEmit` clean, `vite build` clean.

**Behavior now:** Lucky Cat → Fish voice when a key is configured (Settings
page → Anna Storage, or Executa `.env` on the harness) → otherwise a soft
female system voice with zero setup. No API key is baked into the bundle.

**Not done / notes:**
- The old `scripts/fish-e2e-smoke.mjs` targets the pre-refactor Executa RPC
  shape and a Windows Chrome path; it needs updating for the new flow
  (steps 6–9 now assert `tools.invoke`, which matches again).
- `manifest.json` still declares `external_origins: ["https://api.fish.audio"]`
  — harmless now (no browser-direct calls remain) but could be cleaned up.
- Dead code left for a later cleanup pass: `src/hooks/useTextToSpeech.ts` +
  `ReadAloudButton.tsx` (unused since the /ai Read-Aloud removal).

---

## 2026-10-05 (earlier) — E2E investigation, no code changes

- Cloned `eddiechang091/expense-tracker`; traced Lucky Cat →
  `services/tts` → browser-direct Fish fetch.
- Confirmed Fish CORS preflight failure (OPTIONS → 404, no CORS headers).
- Confirmed shipped bundle had no SpeechSynthesis (stale-bundle diagnosis
  for the "system voice" report).
- `vitest` 195/196 (1 stale `isTTSSupported` expectation), `tsc` clean,
  `vite build` clean. No code modified during investigation.
