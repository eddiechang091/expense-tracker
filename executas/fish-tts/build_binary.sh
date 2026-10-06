#!/usr/bin/env bash
# Build the fish-tts Executa as a standalone onefile binary (PyInstaller).
#
# Usage:
#   ./build_binary.sh                 # build for the current platform
#   ./build_binary.sh --test          # build + run protocol smoke test
#   ./build_binary.sh --package       # build + tar.gz the binary
#
# Cross-platform notes:
#   PyInstaller builds for the HOST platform only. Run this script on each
#   target (darwin-arm64, darwin-x86_64, linux-x86_64, windows-x86_64),
#   e.g. via GitHub Actions matrix, then upload each tar.gz to a release
#   and reference them in executa.json "distribution.binary_urls".
#
# The binary resolves .env next to the executable when frozen
# (see _load_env_file in fish_tts/main.py).
set -euo pipefail
cd "$(dirname "$0")"

BIN_NAME="tool-dev-fish-tts"
BUILD_DIR="build"

pip install --quiet pyinstaller 2>/dev/null || pip install --quiet --break-system-packages pyinstaller

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

pyinstaller \
  --onefile \
  --name "$BIN_NAME" \
  --clean \
  --strip \
  --noupx \
  --hidden-import=requests \
  --distpath "$BUILD_DIR/dist" \
  --workpath "$BUILD_DIR/work" \
  --specpath "$BUILD_DIR/spec" \
  fish_tts/main.py

BIN="$BUILD_DIR/dist/$BIN_NAME"
echo "built: $BIN ($(du -h "$BIN" | cut -f1))"
sha256sum "$BIN" | tee "$BUILD_DIR/dist/$BIN_NAME.sha256"

if [[ "${1:-}" == "--test" ]]; then
  echo "--- protocol smoke test ---"
  python3 - "$BIN" <<'EOF'
import json, subprocess, sys
b = sys.argv[1]
p = subprocess.Popen([b], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
def rpc(method, params, rid):
    p.stdin.write(json.dumps({"jsonrpc":"2.0","id":rid,"method":method,"params":params})+"\n"); p.stdin.flush()
    r = json.loads(p.stdout.readline()); assert r["id"]==rid and "result" in r, r; return r
rpc("initialize", {}, 1); rpc("describe", {}, 2)
h = rpc("invoke", {"name":"health","args":{}}, 3)
assert h["result"]["data"]["status"]=="ready", h
s = rpc("invoke", {"name":"synthesize","args":{"text":"hi"}}, 4)
assert s["result"]["success"] is False  # no key in CI: FISH_NOT_CONFIGURED is the expected envelope
assert p.poll() is None, "process died"
p.stdin.close(); p.wait(timeout=15)
print("protocol smoke test OK")
EOF
fi

if [[ "${1:-}" == "--package" ]]; then
  PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/aarch64/arm64/;s/x86_64/x86_64/')"
  # normalize to Anna platform names
  case "$PLATFORM" in
    darwin-arm64)   A="darwin-arm64" ;;
    darwin-x86_64)  A="darwin-x86_64" ;;
    linux-x86_64)   A="linux-x86_64" ;;
    msys*|mingw*|cygwin*|windows*) A="windows-x86_64" ;;
    *) A="$PLATFORM" ;;
  esac
  # Layout matches executa.json binary_artifacts entrypoint ("bin/<name>"):
  #   <name>-<platform>.tar.gz
  #   └── bin/
  #       └── <name> (or <name>.exe on Windows)
  PKGDIR="$BUILD_DIR/pkg"
  rm -rf "$PKGDIR"
  mkdir -p "$PKGDIR/bin"
  if [[ "$A" == "windows-x86_64" ]]; then
    cp "$BUILD_DIR/dist/$BIN_NAME.exe" "$PKGDIR/bin/"
  else
    cp "$BUILD_DIR/dist/$BIN_NAME" "$PKGDIR/bin/"
  fi
  (cd "$PKGDIR" && tar czf "$BUILD_DIR/dist/$BIN_NAME-$A.tar.gz" bin)
  echo "packaged: $BUILD_DIR/dist/$BIN_NAME-$A.tar.gz"
fi
