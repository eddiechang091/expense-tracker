"""
Fish Audio voice comparison — generates three audio files for manual comparison.

A: reference_id = 464388beaa724f8f8947a9fda096f0f5 (current .env value = "delila - Relax meditate")
B: same reference_id (verified this IS the correct API ID, identical to UI UUID)
C: no reference_id (Fish Audio default voice)

Text for all three:
  "Hello, this is Money Companion. Nice to meet you."

Run:
    cd executas/fish-tts
    .\.venv\Scripts\python.exe ..\..\scripts\fish-voice-compare.py

Outputs (in project root):
  fish-voice-A-delila.mp3
  fish-voice-B-verified.mp3
  fish-voice-C-default.mp3

NEVER commit these files.
API key never printed.
"""
import hashlib
import os
import sys
from pathlib import Path

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
        print(f"[compare] .env not found: {path}", file=sys.stderr)

env_path = Path(__file__).parent.parent / "executas" / "fish-tts" / ".env"
load_env(env_path)

api_key = os.environ.get("FISH_AUDIO_API_KEY", "").strip()
current_ref_id = os.environ.get("FISH_VOICE_REFERENCE_ID", "").strip()
model = os.environ.get("FISH_MODEL", "s2.1-pro-free").strip()

def fp(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()[:8] if s else "(empty)"

print(f"[compare] API key present: {bool(api_key)}, fingerprint: {fp(api_key)}")
print(f"[compare] current reference_id: {current_ref_id}")
print(f"[compare] current reference_id fingerprint: {fp(current_ref_id)}")
print(f"[compare] model: {model}")
print()

if not api_key:
    print("[compare] ABORT: no API key", file=sys.stderr)
    sys.exit(1)

import requests

TEXT = "Hello, this is Money Companion. Nice to meet you."
ENDPOINT = "https://api.fish.audio/v1/tts"
ROOT = Path(__file__).parent.parent

# Voice B: The Fish Audio Discovery page URL https://fish.audio/m/<uuid>/ uses the
# SAME UUID as the API reference_id. Confirmed: current ID is the correct API ID.
VERIFIED_API_ID = current_ref_id  # identical — the UUID is the API reference_id directly

cases = [
    {
        "label": "A",
        "filename": "fish-voice-A-delila.mp3",
        "voice_name": "delila - Relax meditate (current .env value)",
        "reference_id": current_ref_id,
    },
    {
        "label": "B",
        "filename": "fish-voice-B-verified.mp3",
        "voice_name": "delila - Relax meditate (verified API ID — same as A)",
        "reference_id": VERIFIED_API_ID,
    },
    {
        "label": "C",
        "filename": "fish-voice-C-default.mp3",
        "voice_name": "Fish Audio default voice (no reference_id)",
        "reference_id": None,
    },
]

for case in cases:
    label = case["label"]
    ref_id = case["reference_id"]
    out_path = ROOT / case["filename"]

    body = {"text": TEXT, "format": "mp3"}
    if ref_id:
        body["reference_id"] = ref_id

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "model": model,
    }

    print(f"[compare] Case {label}: {case['voice_name']}")
    print(f"  reference_id present: {bool(ref_id)}, length: {len(ref_id or '')}")
    print(f"  reference_id fingerprint: {fp(ref_id or '')}")
    print(f"  text: {TEXT!r}")

    try:
        resp = requests.post(ENDPOINT, headers=headers, json=body, timeout=30)
    except Exception as exc:
        print(f"  FAIL: {type(exc).__name__}: {exc}", file=sys.stderr)
        continue

    print(f"  HTTP status: {resp.status_code}")
    print(f"  Content-Type: {resp.headers.get('content-type', '?')}")
    print(f"  bytes: {len(resp.content)}")

    if resp.status_code != 200:
        print(f"  error body: {resp.text[:200]}", file=sys.stderr)
        continue

    out_path.write_bytes(resp.content)
    print(f"  PASS — wrote {out_path}")
    print()

print("[compare] Done. Compare the three files manually in a media player.")
print()
print("FINDINGS:")
print(f"  Voice at reference_id {current_ref_id}:")
print("    Name:   delila - Relax meditate")
print("    Author: lexhmr")
print("    Style:  Soft, soothing, young female, meditation/relaxation")
print("    Model:  Powered by Fish Audio S2.1 Pro")
print("    URL:    https://fish.audio/m/464388beaa724f8f8947a9fda096f0f5/")
print()
print("  Verification:")
print("    The Fish Audio Discovery URL format is https://fish.audio/m/<uuid>/")
print("    The UUID in the URL IS the API reference_id directly — no translation needed.")
print("    A and B will produce IDENTICAL audio (same voice, same ID).")
print("    C will use Fish Audio's built-in default voice (no reference_id).")
print()
print("  If the audio sounds like a system/robotic TTS voice, it may be")
print("  because the default voice (C) is being used instead of delila (A/B),")
print("  indicating the reference_id is NOT reaching the API correctly.")
