#!/bin/bash
# Configure SMTP for ValueScan on VPS
# Usage: SMTP_PASS='your-password' bash deploy/setup-valuescan-smtp.sh
# Or set all vars: SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM

set -e
VS_ENV="/var/www/valuescan/.env"

SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-hello@valuescan.online}"
SMTP_FROM="${SMTP_FROM:-hello@valuescan.online}"

if [ -z "$SMTP_PASS" ]; then
  echo "Set SMTP credentials first. Examples:"
  echo ""
  echo "  Gmail (App Password):"
  echo "    SMTP_HOST=smtp.gmail.com SMTP_USER=you@gmail.com SMTP_PASS=xxxx bash $0"
  echo ""
  echo "  Brevo:"
  echo "    SMTP_HOST=smtp-relay.brevo.com SMTP_USER=your-login SMTP_PASS=xsmtp-key bash $0"
  echo ""
  echo "  Resend:"
  echo "    SMTP_HOST=smtp.resend.com SMTP_USER=resend SMTP_PASS=re_xxx bash $0"
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

set_env SMTP_HOST "$SMTP_HOST"
set_env SMTP_PORT "$SMTP_PORT"
set_env SMTP_USER "$SMTP_USER"
set_env SMTP_PASS "$SMTP_PASS"
set_env SMTP_FROM "$SMTP_FROM"

pm2 restart valuescan --update-env
echo "SMTP configured. Test by triggering a support ticket or monitor alert."
