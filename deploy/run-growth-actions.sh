#!/usr/bin/env bash
# Run link building, marketing seed, and Reddit sync for a ValueScan user.
# Usage (on VPS): bash /var/www/valuescan/deploy/run-growth-actions.sh [email]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export APP_MODE=valuescan
export DATABASE_PATH="${DATABASE_PATH:-$ROOT/server/valuescan.db}"
export VALUESCAN_URL="${VALUESCAN_URL:-https://valuescan.online}"

exec npx tsx deploy/run-growth-actions.ts "${1:-admin@valuescan.online}"
