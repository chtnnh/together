#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/affected.sh
source "$ROOT/scripts/affected.sh"

pnpm exec lint-staged

if git diff --cached --quiet; then
  pnpm exec biome check --changed --error-on-warnings
else
  pnpm exec biome check --staged --error-on-warnings
fi

if git rev-parse origin/main >/dev/null 2>&1; then
  pnpm exec turbo run typecheck --filter=...[origin/main] || pnpm typecheck
else
  pnpm typecheck
fi

pnpm exec vitest run --changed "$MERGE_BASE"

if [ "$AFFECTED_DB" = "1" ]; then
  FORCE_DB_GUARD=1 pnpm ci:db
fi
