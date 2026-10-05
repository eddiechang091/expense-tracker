"""
Fish Audio parity test — run directly (not through Anna).

Usage:
    cd executas/fish-tts
    .\.venv\Scripts\python.exe ..\..\scripts\fish-parity-test.py

Writes fish-python-test.mp3 if successful.
NEVER committed; listed in .gitignore.
"""
import base64
import hashlib
import os
import sys
from pathlib import Path

# Load .env the same way main.py does
def load_env(path: Path) -> None:
    try:
        with open(path, encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                if "#" in val:
                    val = val[:val.index("#")]
                val = val.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
    except FileNotFoundError:
        print(f"[parity] .env not found: {path}", file=sys.stderr)

env_path = Path(__file__).parent.parent / "executas" / "fish-tts" / ".env"
load_env(env_path)

api_key = os.environ.get("FISH_AUDIO_API_KEY", "").strip()
voice_ref = os.environ.get("FISH_VOICE_REFERENCE_ID", "").strip()
model = os.environ.get("FISH_MODEL", "s2.1-pro-free").strip()

# Safe fingerprints — first 8 hex chars of SHA-256 only
def fp(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()[:8] if s else "(empty)"

print(f"[parity] API key present: {bool(api_key)}, fingerprint: {fp(api_key)}")
print(f"[parity] voice_ref present: {bool(voice_ref)}, length: {len(voice_ref)}, fingerprint: {fp(voice_ref)}")
print(f"[parity] model: {model}")

if not api_key:
    print("[parity] ABORT: no API key", file=sys.stderr)
    sys.exit(1)

import requests  # noqa: E402

text = "Hello from Money Companion."
body = {"text": text, "format": "mp3"}
if voice_ref:
    body["reference_id"] = voice_ref

# model goes in HTTP header — NOT in body
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "model": model,
}

print(f"[parity] endpoint: https://api.fish.audio/v1/tts")
print(f"[parity] header model: {model}")
print(f"[parity] body keys: {list(body.keys())}")
print(f"[parity] body reference_id present: {'reference_id' in body}")
print(f"[parity] text length: {len(text)}")

resp = requests.post(
    "https://api.fish.audio/v1/tts",
    headers=headers,
    json=body,
    timeout=30,
)

print(f"[parity] HTTP status: {resp.status_code}")
print(f"[parity] response Content-Type: {resp.headers.get('content-type', '?')}")
print(f"[parity] response bytes: {len(resp.content)}")

if resp.status_code != 200:
    safe = resp.text[:300] if resp.text else "(no body)"
    print(f"[parity] error body: {safe}", file=sys.stderr)
    sys.exit(1)

if len(resp.content) < 100:
    print("[parity] FISH_AUDIO_INVALID: response too small to be audio", file=sys.stderr)
    sys.exit(1)

out = Path(__file__).parent.parent / "fish-python-test.mp3"
out.write_bytes(resp.content)
print(f"[parity] PASS — wrote {out} ({len(resp.content)} bytes)")
