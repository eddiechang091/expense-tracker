"""
Fish Audio TTS Executa — Anna line-oriented JSON stdio protocol.

Configuration (environment variables):
  FISH_AUDIO_API_KEY         Optional when the frontend passes api_key.
                             Your Fish Audio API key.
  FISH_VOICE_REFERENCE_ID    Optional. Voice reference ID (voice preset).
  FISH_MODEL                 Optional. Model name (default: s2.1-pro-free).
  FISH_TTS_TIMEOUT_SEC       Optional. Request timeout in seconds (default: 30).

The API key MUST NOT appear in any frontend source, bundle, or log. It may
arrive as the "api_key" invoke arg (forwarded from the app's Settings page);
the Executa never logs its value, only a truncated SHA-256 fingerprint —
and only when FISH_TTS_DEBUG=1 is set.

The Executa loads its .env file automatically from the same directory as
this file at startup. See .env.example for the expected format.
"""

import base64
import json
import os
import sys
import traceback
from typing import Any
from pathlib import Path


TOOL_NAME = "fish-tts"
TOOL_VERSION = "1.0.2"
FISH_API_BASE = "https://api.fish.audio/v1"
DEFAULT_MODEL = "s2.1-pro-free"
DEFAULT_FORMAT = "mp3"
DEFAULT_TIMEOUT = 30

# Verbose diagnostics (credential fingerprints, request metadata) are only
# printed when FISH_TTS_DEBUG=1. Production stderr stays minimal.
def _is_debug() -> bool:
    # Evaluated lazily so a FISH_TTS_DEBUG=1 set in .env (loaded in main())
    # also takes effect.
    return os.environ.get("FISH_TTS_DEBUG", "").strip() == "1"


def _debug_log(msg: str) -> None:
    if _is_debug():
        print(f"[fish-tts] {msg}", file=sys.stderr, flush=True)


# ---------------------------------------------------------------------------
# .env loader — pure stdlib, no python-dotenv required
# Loads ONLY from the Executa's own directory; never bundles or uploads.
# Must run before any os.environ.get() calls.
# ---------------------------------------------------------------------------

def _load_env_file() -> None:
    """Load .env from the same directory as this file into os.environ.

    Rules:
    - Does not override variables already set in the environment.
    - Strips inline comments and surrounding quotes.
    - Fails silently so missing .env never crashes the process.
    """
    env_path = (
        Path(sys.executable).parent / ".env"
        if getattr(sys, "frozen", False)
        else Path(__file__).parent.parent / ".env"
    )
    api_key_present_before = bool(os.environ.get("FISH_AUDIO_API_KEY", "").strip())
    loaded = False
    try:
        with open(env_path, encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                # Remove inline comment
                if "#" in val:
                    val = val[:val.index("#")]
                val = val.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
                    loaded = True
        print(
            f"[fish-tts] .env loaded from {env_path} "
            f"(FISH_AUDIO_API_KEY was already set: {api_key_present_before})",
            file=sys.stderr, flush=True,
        )
    except FileNotFoundError:
        print(
            f"[fish-tts] .env not found at {env_path} "
            f"(FISH_AUDIO_API_KEY from env: {bool(os.environ.get('FISH_AUDIO_API_KEY','').strip())})",
            file=sys.stderr, flush=True,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[fish-tts] .env load error: {exc}", file=sys.stderr, flush=True)

    # Diagnostics — never print values, only presence/length
    api_key_present = bool(os.environ.get("FISH_AUDIO_API_KEY", "").strip())
    voice_ref = os.environ.get("FISH_VOICE_REFERENCE_ID", "").strip()
    print(
        f"[fish-tts] FISH_AUDIO_API_KEY present: {api_key_present}",
        file=sys.stderr, flush=True,
    )
    print(
        f"[fish-tts] FISH_VOICE_REFERENCE_ID present: {bool(voice_ref)}, "
        f"length: {len(voice_ref)}",
        file=sys.stderr, flush=True,
    )
    print(
        f"[fish-tts] FISH_MODEL: {os.environ.get('FISH_MODEL', DEFAULT_MODEL)}",
        file=sys.stderr, flush=True,
    )
    print(
        f"[fish-tts] cwd: {os.getcwd()}",
        file=sys.stderr, flush=True,
    )


# ---------------------------------------------------------------------------
# Protocol helpers
# ---------------------------------------------------------------------------

def send(obj: dict) -> None:
    """Write a single JSON line to stdout."""
    print(json.dumps(obj), flush=True)


def send_error(req_id: Any, code: int, message: str) -> None:
    send({"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}})


def send_result(req_id: Any, result: Any) -> None:
    send({"jsonrpc": "2.0", "id": req_id, "result": result})


# ---------------------------------------------------------------------------
# Fish Audio synthesis
# ---------------------------------------------------------------------------

def synthesize(params: dict) -> dict:
    """
    Call Fish Audio REST TTS and return base64-encoded audio.

    Returns {"success": True, "data": {"audio_base64": "...", "format": "mp3"}}
    or      {"success": False, "error": "<bounded message>"}.
    """
    import requests  # Imported here so the module loads without the package installed

    # api_key may arrive as an invoke arg (forwarded from the app's Settings
    # page via Anna Storage); otherwise fall back to env / .env.
    api_key = (params.get("api_key") or os.environ.get("FISH_AUDIO_API_KEY", "")).strip()
    api_key_source = "invoke-arg" if (params.get("api_key") or "").strip() else "env"
    if not api_key:
        return {
            "success": False,
            "error": "FISH_NOT_CONFIGURED: Set FISH_AUDIO_API_KEY in executas/fish-tts/.env or configure it in the app Settings.",
        }

    text = (params.get("text") or "").strip()
    if not text:
        return {"success": False, "error": "Text is required."}

    voice_ref = (
        params.get("voice_reference_id")
        or os.environ.get("FISH_VOICE_REFERENCE_ID", "")
    ).strip() or None

    fmt = params.get("format") or DEFAULT_FORMAT
    model = os.environ.get("FISH_MODEL", DEFAULT_MODEL).strip()
    timeout = int(os.environ.get("FISH_TTS_TIMEOUT_SEC", DEFAULT_TIMEOUT))

    body: dict = {"text": text, "format": fmt}
    if voice_ref:
        body["reference_id"] = voice_ref
    # NOTE: model goes in the HTTP header, NOT the JSON body

    # Diagnostics (no secrets logged; fingerprints only with FISH_TTS_DEBUG=1)
    import hashlib as _hashlib

    key_fp = _hashlib.sha256(api_key.encode()).hexdigest()[:8]
    ref_fp = _hashlib.sha256(voice_ref.encode()).hexdigest()[:8] if voice_ref else "(none)"
    _debug_log(
        f"synthesize: endpoint={FISH_API_BASE}/tts "
        f"header-model={model} format={fmt} "
        f"reference_id_present={bool(voice_ref)} reference_id_length={len(voice_ref or '')} "
        f"reference_id_fingerprint={ref_fp} api_key_fingerprint={key_fp} "
        f"api_key_source={api_key_source} "
        f"text_length={len(text)} body_keys={list(body.keys())}"
    )

    try:
        resp = requests.post(
            f"{FISH_API_BASE}/tts",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "model": model,
            },
            json=body,
            timeout=timeout,
        )
    except requests.exceptions.Timeout:
        print("[fish-tts] FISH_TIMEOUT", file=sys.stderr, flush=True)
        return {"success": False, "error": "FISH_TIMEOUT: request timed out."}
    except requests.exceptions.RequestException as exc:
        print(f"[fish-tts] FISH_REQUEST_FAILED: {type(exc).__name__}", file=sys.stderr, flush=True)
        return {"success": False, "error": "FISH_REQUEST_FAILED: network error."}

    print(f"[fish-tts] Fish HTTP status: {resp.status_code}", file=sys.stderr, flush=True)

    if resp.status_code == 401:
        return {"success": False, "error": "FISH_HTTP_401: API key is invalid."}
    if resp.status_code == 402:
        return {"success": False, "error": "FISH_HTTP_402: Fish Audio account has no credits. Add credits at fish.audio."}
    if resp.status_code == 403:
        return {"success": False, "error": "FISH_HTTP_403: access denied."}
    if resp.status_code == 422:
        safe_excerpt = resp.text[:200] if resp.text else ""
        _debug_log(f"FISH_HTTP_422 body excerpt: {safe_excerpt}")
        return {"success": False, "error": "FISH_HTTP_422: invalid request parameters."}
    if resp.status_code == 429:
        return {"success": False, "error": "FISH_HTTP_429: rate limit reached. Try again shortly."}
    if resp.status_code != 200:
        return {"success": False, "error": f"FISH_HTTP_{resp.status_code}: unexpected error."}

    if not resp.content:
        print("[fish-tts] FISH_AUDIO_INVALID: empty response body", file=sys.stderr, flush=True)
        return {"success": False, "error": "FISH_AUDIO_INVALID: empty audio response."}

    print(f"[fish-tts] audio bytes: {len(resp.content)}", file=sys.stderr, flush=True)

    audio_b64 = base64.b64encode(resp.content).decode()
    return _chunked_audio_response(audio_b64, fmt)


# ---------------------------------------------------------------------------
# Chunked audio transfer
#
# The local harness cannot reliably read a single stdout JSON line much
# larger than ~64 KB (empirically: a ~41 KB response works, a ~135 KB
# response kills the Executa with "executa process exited"). Audio larger
# than CHUNK_SIZE_B64 base64 chars is therefore split into numbered chunks;
# the frontend fetches chunk 0 from the synthesize response and the rest
# via the get_chunk method, then reassembles.
# ---------------------------------------------------------------------------

# Base64 chars per chunk — keeps each JSON response line around ~50 KB,
# safely under the harness pipe-read limit.
CHUNK_SIZE_B64 = 48 * 1024

# In-memory chunk sessions: token -> {"audio_b64": str, "format": str}.
# Bounded so abandoned sessions (client gave up mid-transfer) cannot grow
# without limit in a long-running process.
_chunk_sessions: dict = {}
_MAX_CHUNK_SESSIONS = 8


def _chunked_audio_response(audio_b64: str, fmt: str) -> dict:
    """Wrap base64 audio in a (possibly chunked) success response."""
    total = (len(audio_b64) + CHUNK_SIZE_B64 - 1) // CHUNK_SIZE_B64
    if total <= 1:
        return {
            "success": True,
            "data": {
                "audio_base64": audio_b64,
                "format": fmt,
                "total_chunks": 1,
                "chunk_index": 0,
            },
        }
    import uuid as _uuid

    # Evict oldest sessions when bounded.
    while len(_chunk_sessions) >= _MAX_CHUNK_SESSIONS:
        _chunk_sessions.pop(next(iter(_chunk_sessions)))
    token = _uuid.uuid4().hex
    _chunk_sessions[token] = {"audio_b64": audio_b64, "format": fmt}
    _debug_log(
        f"chunked response: {len(audio_b64)} b64 chars in "
        f"{total} chunks, token={token[:8]}…"
    )
    return {
        "success": True,
        "data": {
            "token": token,
            "audio_base64": audio_b64[:CHUNK_SIZE_B64],
            "format": fmt,
            "total_chunks": total,
            "chunk_index": 0,
        },
    }


def _health_payload() -> dict:
    """Report readiness and whether a server-side API key is configured."""
    configured = bool(os.environ.get("FISH_AUDIO_API_KEY", "").strip())
    return {
        "status": "ready",
        "version": TOOL_VERSION,
        "fish_configured": configured,
    }


def get_chunk(params: dict) -> dict:
    """Return one numbered chunk of a previous chunked synthesize response."""
    token = (params.get("token") or "").strip()
    try:
        index = int(params.get("chunk_index", -1))
    except (TypeError, ValueError):
        index = -1
    session = _chunk_sessions.get(token)
    if not session:
        return {"success": False, "error": "CHUNK_UNKNOWN_TOKEN: unknown or expired audio token."}
    audio_b64 = session["audio_b64"]
    total = (len(audio_b64) + CHUNK_SIZE_B64 - 1) // CHUNK_SIZE_B64
    if not 0 <= index < total:
        return {"success": False, "error": f"CHUNK_BAD_INDEX: index {index} out of {total}."}
    chunk = audio_b64[index * CHUNK_SIZE_B64 : (index + 1) * CHUNK_SIZE_B64]
    if index == total - 1:
        # Last chunk delivered — free the session.
        del _chunk_sessions[token]
    return {
        "success": True,
        "data": {
            "token": token,
            "audio_base64": chunk,
            "format": session["format"],
            "total_chunks": total,
            "chunk_index": index,
        },
    }


# ---------------------------------------------------------------------------
# Protocol dispatch
# ---------------------------------------------------------------------------

DESCRIBE_MANIFEST = {
    "name": TOOL_NAME,
    "version": TOOL_VERSION,
    "description": "Money Companion Fish Audio TTS adapter.",
    "tools": [
        {
            "name": "synthesize",
            "description": "Convert text to speech via Fish Audio. Returns base64-encoded audio, chunked when large (see get_chunk).",
            "parameters": [
                {"name": "text", "type": "string", "required": True},
                {"name": "voice_reference_id", "type": "string", "required": False},
                {"name": "format", "type": "string", "required": False},
                {"name": "api_key", "type": "string", "required": False},
            ],
        },
        {
            "name": "get_chunk",
            "description": "Fetch chunk N of a chunked synthesize response.",
            "parameters": [
                {"name": "token", "type": "string", "required": True},
                {"name": "chunk_index", "type": "integer", "required": True},
            ],
        },
    ],
}


def handle(req: dict) -> None:
    method = req.get("method", "")
    req_id = req.get("id")
    params = req.get("params", {}) or {}

    # Notifications have no id and must not produce a response.
    if req_id is None and method.startswith("notifications/"):
        return

    # Log the incoming params structure for dispatch debugging (debug mode only)
    _debug_log(
        f"handle: method={method!r} "
        f"params_keys={sorted(params.keys())} "
        f"full_req_keys={sorted(req.keys())}"
    )
    # If this is an invoke, log nested keys to understand the dispatch format
    if method == "invoke":
        args_candidate = params.get("args") or params.get("arguments") or {}
        _debug_log(
            f"invoke: name={params.get('name')!r} method={params.get('method')!r} "
            f"args_keys={sorted(args_candidate.keys()) if isinstance(args_candidate, dict) else type(args_candidate).__name__}"
        )

    if method == "initialize":
        offered = (params.get("protocolVersion") or "2.0")
        version = offered if offered in ("1.1", "2.0") else "2.0"
        send_result(req_id, {
            "protocolVersion": version,
            "serverInfo": {"name": TOOL_NAME, "version": TOOL_VERSION},
            "client_capabilities": {},
            "capabilities": {},
        })

    elif method == "describe":
        send_result(req_id, DESCRIBE_MANIFEST)

    elif method == "health":
        send_result(req_id, _health_payload())

    elif method == "invoke":
        # Anna host API format: {"method":"invoke","params":{"name":"synthesize","args":{...}}}
        # MCP format may use "arguments" instead of "args"
        tool_method = (
            params.get("name")
            or params.get("method")
            or params.get("tool")
            or ""
        )
        args = (
            params.get("args")
            or params.get("arguments")
            or params.get("parameters")
            or {}
        )
        _debug_log(
            f"invoke dispatch: tool_method={tool_method!r} "
            f"args_keys={sorted(args.keys()) if isinstance(args, dict) else type(args).__name__}"
        )
        if tool_method == "synthesize":
            result = synthesize(args)
            send_result(req_id, result)
        elif tool_method == "get_chunk":
            result = get_chunk(args if isinstance(args, dict) else {})
            send_result(req_id, result)
        elif tool_method == "health":
            # The Anna host routes tool calls as tools.invoke, so health
            # must be reachable here as well as via the direct method.
            send_result(req_id, {"success": True, "data": _health_payload()})
        else:
            send_error(req_id, -32601, f"Unknown invoke method: {tool_method!r}")

    elif method == "synthesize":
        # Direct dispatch format used by anna-app executa dev --invoke synthesize
        args = params.get("args") or params or {}
        # Strip the 'args' nesting if it was double-wrapped
        if "args" in args and isinstance(args["args"], dict):
            args = args["args"]
        result = synthesize(args)
        send_result(req_id, result)

    elif method == "get_chunk":
        args = params.get("args") or params or {}
        if "args" in args and isinstance(args["args"], dict):
            args = args["args"]
        result = get_chunk(args if isinstance(args, dict) else {})
        send_result(req_id, result)

    elif method == "shutdown":
        send_result(req_id, {"ok": True})
        # Flush stdout and wait before exiting — same race-condition guard as
        # the EOF path in main(). The harness must finish reading any large
        # pending stdout response before we exit.
        sys.stdout.flush()
        import time as _time
        _time.sleep(4)
        sys.exit(0)

    else:
        if req_id is not None:
            send_error(req_id, -32601, f"Method not found: {method!r}")


def main() -> None:
    # Load .env FIRST before anything reads os.environ
    _load_env_file()

    print(f"[fish-tts {TOOL_VERSION}] ready", file=sys.stderr, flush=True)
    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError as exc:
            send_error(None, -32700, f"Parse error: {exc}")
            continue
        try:
            handle(req)
        except Exception:  # noqa: BLE001
            req_id = req.get("id")
            print(traceback.format_exc(), file=sys.stderr, flush=True)
            if req_id is not None:
                send_error(req_id, -32603, "Internal error.")

    # stdin reached EOF — the harness closed the write end of the stdin pipe.
    # Flush stdout and wait before exiting so the harness process-monitor does
    # not fire while it is still draining our large stdout response from the
    # OS pipe buffer. 213 KB of MP3 base64-encoded is ~285 KB of JSON; at local
    # pipe throughput that takes well under 1 second to transfer, but the
    # harness asyncio scheduler needs a moment to process and forward it.
    # Without this delay the harness detects "process exited" before the
    # browser receives the audio, causing a spurious tool_failed error.
    sys.stdout.flush()
    import time as _time
    _time.sleep(4)
    _debug_log("exiting after drain wait")


if __name__ == "__main__":
    main()

