#!/usr/bin/env bash
# Set STRIPE_SECRET_KEY on VPS and run billing setup.
# Usage: STRIPE_SECRET_KEY='sk_live_...' bash deploy/set-stripe-secret.sh

set -euo pipefail
VS_ENV="/var/www/valuescan/.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "${STRIPE_SECRET_KEY:-}" ]; then
  echo "Set STRIPE_SECRET_KEY first."
  exit 1
fi

set_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$VS_ENV"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$VS_ENV"
  else
    echo "${key}=${val}" >> "$VS_ENV"
  fi
}

set_env STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"
bash "$SCRIPT_DIR/setup-valuescan-billing.sh"
