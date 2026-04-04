#!/bin/sh
# Xcode Cloud — runs after the repo is cloned, before the build starts.
# Installs Node dependencies and CocoaPods so the workspace can be resolved.

set -e

echo "=== ci_post_clone.sh ==="
echo "Working dir: $(pwd)"
echo "Xcode Cloud repo root: $CI_WORKSPACE"

REPO_ROOT="$CI_WORKSPACE"

# ── Node / npm ────────────────────────────────────────────────────────────────
# Xcode Cloud has Homebrew available; install Node if missing.
if ! command -v node >/dev/null 2>&1; then
  echo "Node not found — installing via Homebrew..."
  brew install node
fi

echo "Node: $(node --version)"
echo "npm:  $(npm --version)"

echo "Installing npm dependencies..."
npm ci --prefix "$REPO_ROOT"

# ── CocoaPods ─────────────────────────────────────────────────────────────────
if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods not found — installing..."
  sudo gem install cocoapods --no-document
fi

echo "CocoaPods: $(pod --version)"

echo "Running pod install..."
cd "$REPO_ROOT/ios/App"
pod install --repo-update

echo "=== ci_post_clone.sh done ==="
