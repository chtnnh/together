#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TMP="${TMPDIR:-/tmp}/together-linux-snap-$$"
IMAGE="${PLAYWRIGHT_DOCKER_IMAGE:-mcr.microsoft.com/playwright:v1.61.0-jammy}"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

if [[ ! -f "$ROOT/package.json" ]]; then
  echo "Expected monorepo root at $ROOT (missing package.json)" >&2
  exit 1
fi

rsync -a --exclude node_modules --exclude .git "$ROOT/" "$TMP/"

docker run --rm --init --network host \
  -e CI=1 \
  -e PLAYWRIGHT_FORCE_ASYNC_LOADER=1 \
  -v "$TMP:/work" \
  -w /work \
  "$IMAGE" \
  bash -lc 'corepack enable && corepack prepare pnpm@11.9.0 --activate && cd /work && pnpm install --frozen-lockfile && pnpm --filter @together/web test:install && cd apps/web && pnpm exec playwright test visual-regression.spec.ts --update-snapshots'

rsync -a "$TMP/apps/web/e2e/visual-regression.spec.ts-snapshots/" \
  "$ROOT/apps/web/e2e/visual-regression.spec.ts-snapshots/"

echo "Linux visual snapshots copied to apps/web/e2e/visual-regression.spec.ts-snapshots/*-linux/"
