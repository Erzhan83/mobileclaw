#!/bin/bash
set -euo pipefail

# Xcode Cloud post-clone script
# Installs Node.js/pnpm and builds the Next.js static export
# so the web assets are available for the iOS app bundle.

echo "=== Installing Node.js via Homebrew ==="
brew install node

echo "=== Installing pnpm ==="
npm install -g pnpm

echo "=== Building web assets ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
pnpm install --frozen-lockfile
make build-web

echo "=== Web build complete ==="
ls -la ios/MobileClaw/Resources/web/ | head -5
