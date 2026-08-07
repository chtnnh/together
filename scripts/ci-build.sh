#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOG="$(mktemp)"
trap 'rm -f "$LOG"' EXIT

pnpm --filter @together/web build 2>&1 | tee "$LOG"
pnpm --filter @together/realtime build 2>&1 | tee -a "$LOG"

if grep -q '"level":"error"' "$LOG"; then
  echo "ci:build failed: build output contains error-level application logs."
  echo "Fix the underlying issue or mark cookie/auth routes as dynamic."
  exit 1
fi
