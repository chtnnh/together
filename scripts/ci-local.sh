#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ "${CI:-}" != "1" ] && [ "${SKIP_INSTALL:-}" != "1" ]; then
  pnpm install --frozen-lockfile
fi

echo "==> ci:quality"
pnpm ci:quality

echo "==> ci:build"
pnpm ci:build

echo "==> ci:unit"
pnpm ci:unit

echo "==> ci:db"
pnpm ci:db

echo "==> ci:e2e"
pnpm ci:e2e

echo "==> ci:visual"
pnpm ci:visual

echo "ci:local passed"
