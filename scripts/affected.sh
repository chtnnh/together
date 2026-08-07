#!/usr/bin/env bash
# Computes changed paths vs merge-base with main and exports AFFECTED_* flags.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BASE="${CI_MERGE_BASE:-}"
if [ -z "$BASE" ]; then
  BASE="$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || echo "")"
fi
if [ -z "$BASE" ]; then
  BASE="$(git rev-parse HEAD~1 2>/dev/null || git rev-parse HEAD)"
fi

CHANGED="$(git diff --name-only "$BASE"...HEAD 2>/dev/null || git diff --name-only "$BASE" HEAD)"
STAGED="$(git diff --cached --name-only 2>/dev/null || true)"
ALL_CHANGED="$(printf '%s\n%s' "$CHANGED" "$STAGED" | sort -u | grep -v '^$' || true)"

export AFFECTED_WEB=0
export AFFECTED_UI=0
export AFFECTED_SHARED=0
export AFFECTED_REALTIME=0
export AFFECTED_DB=0
export AFFECTED_VISUAL=0
export AFFECTED_INFRA=0
export MERGE_BASE="$BASE"
export CHANGED_FILE_COUNT=0

if [ -n "$ALL_CHANGED" ]; then
  CHANGED_FILE_COUNT="$(echo "$ALL_CHANGED" | wc -l | tr -d ' ')"
fi
export CHANGED_FILE_COUNT

match_changed() {
  echo "$ALL_CHANGED" | grep -qE "$1"
}

if match_changed '^apps/web/'; then AFFECTED_WEB=1; fi
if match_changed '^packages/ui/|^apps/web/src/components/'; then AFFECTED_UI=1; fi
if match_changed '^packages/shared/'; then AFFECTED_SHARED=1; fi
if match_changed '^services/realtime/'; then AFFECTED_REALTIME=1; fi
if match_changed '^packages/db/src/schema\.ts'; then AFFECTED_DB=1; fi
if match_changed '^apps/web/e2e/visual-regression\.spec\.ts'; then AFFECTED_VISUAL=1; fi
if match_changed '^\.github/workflows/|^apps/web/playwright\.config\.ts|^scripts/ci'; then AFFECTED_INFRA=1; fi
if [ "$AFFECTED_UI" = "1" ]; then AFFECTED_VISUAL=1; fi

export AFFECTED_WEB AFFECTED_UI AFFECTED_SHARED AFFECTED_REALTIME AFFECTED_DB AFFECTED_VISUAL AFFECTED_INFRA
