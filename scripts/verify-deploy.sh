#!/usr/bin/env bash
# verify-deploy.sh — Post-deploy live verification.
#
# Curls the live GitHub Pages URLs and confirms the expected version string
# appears in the deployed bundle and sw.js. Polls with backoff because Pages
# takes ~60–90s to publish after push.
#
# Why: existing scripts/sync-sw-version.cjs validates LOCAL files match.
# This validates the LIVE site actually shipped the new version — catches
# the "cache masking shipped fixes" + "Pages build silently failed" cases.
#
# Pnimit is a Vite-bundled app: pnimit-mega.html references a content-hashed
# JS bundle (assets/pnimit-mega-*.js). The version literal lives inside that
# bundle (as the minified APP_VERSION string), so we follow the script tag,
# fetch the bundle, then grep for the version string.
#
# Usage:
#   ./scripts/verify-deploy.sh                # uses src/core/constants.js APP_VERSION
#   ./scripts/verify-deploy.sh 10.4.4         # explicit version
#   ./scripts/verify-deploy.sh --wait 180     # max wait seconds (default 120)
#   ./scripts/verify-deploy.sh --no-wait      # one-shot check, no polling
#
# Note: IM convention is package.json version = APP_VERSION + ".0" (4-part),
# enforced by tests/regressionGuards.test.js. The live site ships the 3-part
# APP_VERSION, not the 4-part package.json version, so this script reads
# APP_VERSION directly to avoid the .0 mismatch.
#
# Exit codes:
#   0 — both bundle and sw.js show the expected version
#   1 — version mismatch after wait window
#   2 — usage error or network failure

set -u

LIVE_HTML='https://eiasash.github.io/InternalMedicine/pnimit-mega.html'
LIVE_SW='https://eiasash.github.io/InternalMedicine/sw.js'
LIVE_BASE='https://eiasash.github.io/InternalMedicine'
WAIT_MAX=120
INTERVAL=10
ONESHOT=0
VERSION=''

while [[ $# -gt 0 ]]; do
  case "$1" in
    --wait) WAIT_MAX="$2"; shift 2;;
    --no-wait) ONESHOT=1; shift;;
    -h|--help) sed -n '1,30p' "$0"; exit 0;;
    -*) echo "verify-deploy: unknown flag $1" >&2; exit 2;;
    *) VERSION="$1"; shift;;
  esac
done

if [[ -z "$VERSION" ]]; then
  # Read APP_VERSION from src/core/constants.js (3-part), NOT package.json (4-part).
  # See header comment: package.json deliberately carries +.0 suffix per regressionGuards.test.js.
  if ! VERSION=$(node -p "require('fs').readFileSync('src/core/constants.js','utf8').match(/APP_VERSION\s*=\s*['\"]([^'\"]+)['\"]/)[1]" 2>/dev/null); then
    echo "verify-deploy: cannot read APP_VERSION from src/core/constants.js" >&2
    exit 2
  fi
fi

echo "verify-deploy: expecting v${VERSION}"
echo "  HTML: ${LIVE_HTML}"
echo "  SW:   ${LIVE_SW}"

start=$(date +%s)
while true; do
  bundle_ok=0
  sw_ok=0
  bundle_path=''

  html_body=$(curl -sf -A 'Mozilla/5.0 verify-deploy' --max-time 15 "${LIVE_HTML}" || true)
  sw_body=$(curl -sf -A 'Mozilla/5.0 verify-deploy' --max-time 15 "${LIVE_SW}" || true)

  # Extract the hashed bundle path from the HTML script tag.
  bundle_path=$(printf '%s' "$html_body" | grep -oE '/InternalMedicine/assets/pnimit-mega-[A-Za-z0-9_-]+\.js' | head -n1)

  if [[ -n "$bundle_path" ]]; then
    bundle_url="https://eiasash.github.io${bundle_path}"
    bundle_body=$(curl -sf -A 'Mozilla/5.0 verify-deploy' --max-time 30 "${bundle_url}" || true)
    if printf '%s' "$bundle_body" | grep -qF "\"${VERSION}\""; then
      bundle_ok=1
    fi
  fi

  if printf '%s' "$sw_body" | grep -qF "pnimit-v${VERSION}"; then
    sw_ok=1
  fi

  if [[ "$bundle_ok" = 1 && "$sw_ok" = 1 ]]; then
    elapsed=$(( $(date +%s) - start ))
    echo "  BUNDLE APP_VERSION=\"${VERSION}\"   PASS  (${bundle_path})"
    echo "  SW     CACHE=pnimit-v${VERSION}    PASS"
    echo "verify-deploy: PASS (after ${elapsed}s)"
    exit 0
  fi

  elapsed=$(( $(date +%s) - start ))
  if [[ "$ONESHOT" = 1 ]] || (( elapsed >= WAIT_MAX )); then
    echo ""
    echo "verify-deploy: FAIL after ${elapsed}s"
    if [[ -z "$bundle_path" ]]; then
      echo "  ✗ live HTML missing bundle script tag (assets/pnimit-mega-*.js)"
    elif [[ "$bundle_ok" = 0 ]]; then
      echo "  ✗ live bundle ${bundle_path} missing version string \"${VERSION}\""
    fi
    [[ "$sw_ok" = 0 ]] && echo "  ✗ live sw.js missing 'pnimit-v${VERSION}'"
    echo ""
    echo "Possible causes:"
    echo "  - GitHub Pages still building — wait 30s, retry"
    echo "  - Push didn't land on main"
    echo "  - Trinity drift — run: node scripts/sync-sw-version.cjs"
    echo "  - package.json version (e.g. '10.4.4.0') differs from APP_VERSION ('10.4.4'); pass explicit version arg"
    echo "  - CDN cache — try cache-busted URL: ${LIVE_HTML}?v=${VERSION}"
    exit 1
  fi

  echo "  ...polling (bundle=${bundle_ok} sw=${sw_ok}, ${elapsed}s/${WAIT_MAX}s) — sleeping ${INTERVAL}s"
  sleep "$INTERVAL"
done
