#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/affected.sh
source "$ROOT/scripts/affected.sh"

if [ "${CHANGED_FILE_COUNT:-0}" -gt 30 ] || [ "$AFFECTED_INFRA" = "1" ]; then
  echo "Large or infra change — running full ci:local"
  SKIP_INSTALL=1 pnpm ci:local
  exit 0
fi

pnpm exec biome check --error-on-warnings .

if git rev-parse origin/main >/dev/null 2>&1; then
  pnpm exec turbo run typecheck --filter=...[origin/main] || pnpm typecheck
else
  pnpm typecheck
fi

pnpm exec vitest run --changed "$MERGE_BASE"

if [ "$AFFECTED_WEB" = "1" ] || [ "$AFFECTED_REALTIME" = "1" ]; then
  pnpm ci:build
fi

if [ "$AFFECTED_DB" = "1" ]; then
  FORCE_DB_GUARD=1 pnpm ci:db
fi

SPECS="$(pnpm exec tsx scripts/e2e-affected.ts)"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/together}"
export ROOM_TOKEN_SECRET="${ROOM_TOKEN_SECRET:-test-secret}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
export NEXT_PUBLIC_REALTIME_URL="${NEXT_PUBLIC_REALTIME_URL:-ws://localhost:8787}"

pnpm --filter @together/web test:install

if [ -n "$SPECS" ]; then
  echo "Running @smoke E2E"
  pnpm --filter @together/web exec playwright test --project=chromium --grep @smoke
  echo "Running affected E2E: $SPECS"
  # shellcheck disable=SC2086
  pnpm --filter @together/web exec playwright test --project=chromium $SPECS
else
  echo "Running @smoke E2E only"
  pnpm --filter @together/web exec playwright test --project=chromium --grep @smoke
fi

if [ "$AFFECTED_VISUAL" = "1" ]; then
  pnpm ci:visual
fi
