#!/usr/bin/env bash
# Validates drizzle journal integrity; warns when schema changed without new migration.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SCHEMA="packages/db/src/schema.ts"
JOURNAL="packages/db/drizzle/meta/_journal.json"

if [ ! -f "$JOURNAL" ]; then
  echo "Missing drizzle journal at $JOURNAL"
  exit 1
fi

for sql in packages/db/drizzle/*.sql; do
  [ -f "$sql" ] || continue
  tag="$(basename "$sql" .sql)"
  if ! grep -q "\"$tag\"" "$JOURNAL"; then
    echo "Orphan migration not in journal: $(basename "$sql") — run pnpm db:generate and commit meta/"
    exit 1
  fi
done

BASE="$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || echo "")"
if [ -n "$BASE" ] && git diff --name-only "$BASE"...HEAD | grep -q "^${SCHEMA}$"; then
  IDX="$(node -e "const j=require('./$JOURNAL'); console.log(String(j.entries.at(-1)?.idx ?? ''))" 2>/dev/null || true)"
  if [ -z "$IDX" ]; then
    echo "schema.ts changed but drizzle journal has no entries"
    exit 1
  fi
  SNAPSHOT="packages/db/drizzle/meta/$(printf '%04d' "$IDX")_snapshot.json"
  if [ ! -f "$SNAPSHOT" ]; then
    echo "schema.ts changed — missing snapshot $SNAPSHOT (run pnpm db:generate)"
    exit 1
  fi
fi

echo "DB guard: OK"
