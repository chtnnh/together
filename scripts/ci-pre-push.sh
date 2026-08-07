#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/affected.sh
source "$ROOT/scripts/affected.sh"

# E2E and visual run in CI only (pnpm ci:local / GitHub Actions).
if [ "${CHANGED_FILE_COUNT:-0}" -gt 30 ] || [ "$AFFECTED_INFRA" = "1" ]; then
  echo "Large or infra change - running full quality, build, unit, and db checks (no E2E/visual)"
  SKIP_INSTALL=1 pnpm ci:quality
  pnpm ci:build
  pnpm ci:unit
  pnpm ci:db
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
