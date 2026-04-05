#!/bin/sh
# Xcode Cloud — runs after the repo is cloned, before the build starts.
# Installs Node dependencies and CocoaPods so the workspace can be resolved.

set -eu

echo "=== ci_post_clone.sh ==="
echo "Working dir: $(pwd)"
echo "Xcode Cloud repo root: $CI_WORKSPACE"

REPO_ROOT="${CI_WORKSPACE:-$(cd "$(dirname "$0")/../../.." && pwd)}"

# ── Node / npm ────────────────────────────────────────────────────────────────
# Xcode Cloud has Homebrew available; install Node if missing.
if ! command -v node >/dev/null 2>&1; then
  echo "Node not found — installing via Homebrew..."
  brew install node
fi

echo "Node: $(node --version)"
echo "npm:  $(npm --version)"

echo "Installing npm dependencies..."
npm ci --no-audit --no-fund --prefix "$REPO_ROOT"

# ── CocoaPods ─────────────────────────────────────────────────────────────────
if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods not found — installing in user gem path..."
  GEM_BIN="$(ruby -r rubygems -e 'print Gem.user_dir')/bin"
  export PATH="$GEM_BIN:$PATH"
  gem install cocoapods --user-install --no-document
fi

echo "CocoaPods: $(pod --version)"

echo "Running pod install..."
cd "$REPO_ROOT/ios/App"
pod install

echo "=== ci_post_clone.sh done ==="
