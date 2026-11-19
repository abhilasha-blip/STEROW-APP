#!/usr/bin/env bash
# Fails if a URL or backend path string appears in src/ outside the two allowed files:
#   src/api/endpoints.ts (every path) and src/config/env.ts (base URLs come from .env).
# Also bans the website's /_serverFn/ routes everywhere.
set -euo pipefail
cd "$(dirname "$0")/.."
pattern="https?://|\.supabase\.co|['\"\`]/(auth|rest|api|storage|functions|_serverFn)(/|['\"\`])|_serverFn"
matches=$(grep -rnE --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  "$pattern" src \
  --exclude=endpoints.ts --exclude=env.ts || true)
serverfn=$(grep -rn --include='*.ts' --include='*.tsx' '_serverFn' src scripts --exclude=check-urls.sh || true)
status=0
if [ -n "$matches" ]; then
  echo "✖ URL / backend path literals found outside src/api/endpoints.ts and src/config/env.ts:"
  echo "$matches"
  status=1
fi
if [ -n "$serverfn" ]; then
  echo "✖ /_serverFn/ routes are forbidden (their hashes change with every web build):"
  echo "$serverfn"
  status=1
fi
[ $status -eq 0 ] && echo "✔ No URL literals outside src/api/endpoints.ts and src/config/env.ts"
exit $status
