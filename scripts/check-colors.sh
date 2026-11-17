#!/usr/bin/env bash
# Fails if any raw colour literal appears in src/ outside src/theme/palette.ts.
set -euo pipefail
cd "$(dirname "$0")/.."
matches=$(grep -rnE --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  "#[0-9a-fA-F]{3,8}\b|rgba?\(" src --exclude=palette.ts || true)
if [ -n "$matches" ]; then
  echo "✖ Raw colour literals found outside src/theme/palette.ts:"
  echo "$matches"
  exit 1
fi
echo "✔ No raw colour literals outside src/theme/palette.ts"
