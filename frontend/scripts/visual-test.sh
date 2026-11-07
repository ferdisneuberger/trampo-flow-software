#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.64.1-noble"
NODE_MODULES_VOLUME="trampo-visual-node-modules"

if [[ "$(uname -s)" == "Darwin" ]]; then
  echo "visual: macOS detectado; usando o container Linux para bater com o CI."
  docker run --rm --platform linux/amd64 \
    -v "$ROOT":/app \
    -v "${NODE_MODULES_VOLUME}":/app/node_modules \
    -w /app \
    -e CI=1 \
    -e PLAYWRIGHT_WEBSERVER=1 \
    "$PLAYWRIGHT_IMAGE" \
    bash -lc 'npm ci && npm run build && npx playwright test --project=visual "$@"' visual "$@"
  exit 0
fi

npm run build
PLAYWRIGHT_WEBSERVER=1 npx playwright test --project=visual "$@"
