#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# release-ios.sh
#
# Fresh web build + Capacitor sync before every iOS archive.
# Run this script instead of opening Xcode directly.
#
# Usage:
#   npm run release:ios              # full flow (lint + build + sync + open)
#   npm run release:ios -- --no-lint # skip lint (quicker on subsequent runs)
#   npm run release:ios -- --no-open # skip opening Xcode (CI / dry-run)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { echo -e "${CYAN}▸${RESET} $*"; }
ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET} $*"; }
fail() { echo -e "${RED}✗ ERROR:${RESET} $*" >&2; exit 1; }
step() { echo -e "\n${BOLD}── $* ──${RESET}"; }

# ── Parse flags ───────────────────────────────────────────────────────────────
SKIP_LINT=false
SKIP_OPEN=false
for arg in "$@"; do
  case "$arg" in
    --no-lint) SKIP_LINT=true ;;
    --no-open) SKIP_OPEN=true ;;
  esac
done

# ── Sanity checks ─────────────────────────────────────────────────────────────
step "Pre-flight checks"

# Must run from repo root
if [[ ! -f "package.json" || ! -d "ios" ]]; then
  fail "Run this script from the project root (where package.json and ios/ live)."
fi

# node_modules present
if [[ ! -d "node_modules" ]]; then
  fail "node_modules not found. Run 'npm install' first."
fi

# capacitor CLI available
if ! npx cap --version &>/dev/null; then
  fail "'npx cap' not available. Check Capacitor installation."
fi

ok "All pre-flight checks passed."

WEB_BUILD=$(node -p "JSON.parse(require('fs').readFileSync('capacitor.config.json', 'utf8')).webDir || 'dist/spa'")

# ── Git status warning ────────────────────────────────────────────────────────
step "Git status"
if git diff --quiet && git diff --cached --quiet; then
  ok "Working tree is clean."
else
  warn "You have uncommitted changes:"
  git status --short
  echo ""
  read -r -p "$(echo -e "${YELLOW}Continue anyway?${RESET} [y/N] ")" REPLY
  if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
    fail "Aborted. Commit or stash your changes before releasing."
  fi
fi

# ── Lint ──────────────────────────────────────────────────────────────────────
if [[ "$SKIP_LINT" == false ]]; then
  step "Lint (eslint)"
  if npm run lint; then
    ok "Lint passed."
  else
    fail "Lint failed. Fix errors before archiving."
  fi
else
  warn "Lint skipped (--no-lint)."
fi

# ── Fresh web build ───────────────────────────────────────────────────────────
step "Web build (quasar build)"
log "Cleaning previous dist..."
rm -rf dist/

if ! npm run build; then
  fail "quasar build failed. Check the output above."
fi

# Verify dist was produced
if [[ ! -d "$WEB_BUILD" ]]; then
  fail "$WEB_BUILD not found after build. Check capacitor.config.json webDir and quasar output."
fi
ok "Web build succeeded → $WEB_BUILD"

# ── Capacitor sync ────────────────────────────────────────────────────────────
step "Capacitor sync (cap sync ios)"
log "Copying web assets and syncing native plugins..."
if ! npx cap sync ios; then
  fail "cap sync ios failed."
fi
ok "Capacitor sync complete."

# ── Asset freshness verification ──────────────────────────────────────────────
step "Asset freshness check"

IOS_WWW="ios/App/App/public"

if [[ ! -d "$IOS_WWW" ]]; then
  warn "iOS www folder not found at $IOS_WWW — skipping timestamp check."
else
  # Compare index.html modification times
  BUILD_INDEX="$WEB_BUILD/index.html"
  IOS_INDEX="$IOS_WWW/index.html"

  if [[ -f "$BUILD_INDEX" && -f "$IOS_INDEX" ]]; then
    BUILD_TS=$(date -r "$BUILD_INDEX" '+%s' 2>/dev/null || stat -c '%Y' "$BUILD_INDEX" 2>/dev/null)
    IOS_TS=$(date -r "$IOS_INDEX" '+%s' 2>/dev/null || stat -c '%Y' "$IOS_INDEX" 2>/dev/null)

    if [[ "$BUILD_TS" == "$IOS_TS" ]]; then
      ok "iOS index.html timestamp matches web build — assets are fresh."
    else
      warn "iOS index.html timestamp differs from web build. cap sync may have had issues."
      warn "  web build: $(date -r "$BUILD_INDEX" 2>/dev/null || echo $BUILD_TS)"
      warn "  iOS shell: $(date -r "$IOS_INDEX" 2>/dev/null || echo $IOS_TS)"
    fi
  else
    warn "Cannot compare timestamps — one or both index.html files missing."
  fi

  # Check for .DS_Store or debug artifacts that shouldn't ship
  DS_COUNT=$(find "$IOS_WWW" -name ".DS_Store" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$DS_COUNT" -gt 0 ]]; then
    warn "$DS_COUNT .DS_Store file(s) found in iOS public — consider adding to .gitignore."
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
step "Release summary"
BUILD_TIME=$(date '+%Y-%m-%d %H:%M:%S')
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo -e "  ${BOLD}Time:${RESET}    $BUILD_TIME"
echo -e "  ${BOLD}Branch:${RESET}  $GIT_BRANCH"
echo -e "  ${BOLD}Commit:${RESET}  $GIT_HASH"
echo ""
ok "iOS shell is ready for archive. Open Xcode → Product → Archive."

# ── Open Xcode ────────────────────────────────────────────────────────────────
if [[ "$SKIP_OPEN" == false ]]; then
  step "Opening Xcode"
  WORKSPACE="ios/App/App.xcworkspace"
  if [[ -d "$WORKSPACE" ]]; then
    open "$WORKSPACE"
    ok "Xcode opened: $WORKSPACE"
  else
    warn "Workspace not found at $WORKSPACE — open Xcode manually."
  fi
fi

echo ""
echo -e "${GREEN}${BOLD}All done. Ready to archive.${RESET}"
