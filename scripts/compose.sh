#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
find . -name '._*' -not -path './.git/*' -delete 2>/dev/null || true
exec docker compose "$@"
