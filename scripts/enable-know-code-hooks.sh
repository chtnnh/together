#!/usr/bin/env bash
# Enable know-code git hooks on this machine (creates gitignored .husky/*.local files).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for hook in pre-commit pre-push; do
  src=".husky/${hook}.local.example"
  dest=".husky/${hook}.local"
  if [ -f "$dest" ]; then
    echo "Already exists: $dest"
  else
    cp "$src" "$dest"
    echo "Created $dest"
  fi
done

if ! command -v know-code >/dev/null 2>&1; then
  echo ""
  echo "Install know-code: npm i -g @chtnnh/know-code"
  echo "One-time: know-code attest-init && know-code range begin"
  echo "Docs: https://kc.chtnnhfoundation.org"
else
  echo ""
  know-code doctor 2>/dev/null || true
fi
