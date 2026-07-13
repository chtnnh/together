#!/usr/bin/env bash
# Run visual regression in a Linux amd64 Playwright container — same environment
# for local snapshot updates and CI verification (one canonical snapshot set in git).
set -euo pipefail

MODE="${1:-test}"
if [[ "$MODE" != "test" && "$MODE" != "update" ]]; then
  echo "Usage: $0 [test|update]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TMP="${TMPDIR:-/tmp}/together-visual-$$"
IMAGE="${PLAYWRIGHT_DOCKER_IMAGE:-mcr.microsoft.com/playwright:v1.61.0-jammy}"

UPDATE_FLAG=""
if [[ "$MODE" == "update" ]]; then
  UPDATE_FLAG="--update-snapshots"
fi

cleanup() {
  if [[ ! -d "$TMP" ]]; then
    return 0
  fi
  docker run --rm --platform linux/amd64 -v "$TMP:/cleanup" "$IMAGE" rm -rf /cleanup 2>/dev/null \
    || rm -rf "$TMP" 2>/dev/null \
    || true
}
trap cleanup EXIT

if [[ ! -f "$ROOT/package.json" ]]; then
  echo "Expected monorepo root at $ROOT (missing package.json)" >&2
  exit 1
fi

rsync -a \
  --exclude node_modules \
  --exclude .git \
  --exclude .next \
  --exclude test-results \
  "$ROOT/" "$TMP/"

docker run --rm --init --platform linux/amd64 --network host \
  -e CI=1 \
  -e PLAYWRIGHT_FORCE_ASYNC_LOADER=1 \
  -v "$TMP:/work" \
  -w /work \
  "$IMAGE" \
  bash -lc "corepack enable && corepack prepare pnpm@11.9.0 --activate && cd /work && pnpm install --frozen-lockfile && cd apps/web && pnpm exec playwright test visual-regression.spec.ts ${UPDATE_FLAG}"

if [[ "$MODE" == "update" ]]; then
  rsync -a "$TMP/apps/web/e2e/visual-regression.spec.ts-snapshots/" \
    "$ROOT/apps/web/e2e/visual-regression.spec.ts-snapshots/"
  echo "Visual snapshots updated in apps/web/e2e/visual-regression.spec.ts-snapshots/"
fi
