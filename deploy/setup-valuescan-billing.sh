#!/bin/bash
# Wire ValueScan .env with Stripe (from marketplace) + create webhook & prices
# Run on VPS: bash /var/www/valuescan/deploy/setup-valuescan-billing.sh

set -e
VS_ENV="/var/www/valuescan/.env"
MP_ENV="/var/www/marketplace-hub/.env"

if [ ! -f "$VS_ENV" ]; then
  echo "Missing $VS_ENV"
  exit 1
fi

get_env() {
  local file="$1" key="$2"
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r'
}

set_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$VS_ENV"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$VS_ENV"
  else
    echo "${key}=${val}" >> "$VS_ENV"
  fi
}

STRIPE_KEY="$(get_env "$VS_ENV" STRIPE_SECRET_KEY)"
if [ -z "$STRIPE_KEY" ] && [ -f "$MP_ENV" ]; then
  STRIPE_KEY="$(get_env "$MP_ENV" STRIPE_SECRET_KEY)"
fi

if [ -z "$STRIPE_KEY" ]; then
  echo "No STRIPE_SECRET_KEY found. Add it to $VS_ENV manually."
  exit 1
fi

echo "Using Stripe key ending ...${STRIPE_KEY: -4}"
set_env "STRIPE_SECRET_KEY" "$STRIPE_KEY"

WEBHOOK_URL="https://valuescan.online/api/billing/webhook"
EXISTING="$(curl -s -G https://api.stripe.com/v1/webhook_endpoints \
  -u "${STRIPE_KEY}:" \
  -d limit=100 | python3 -c "
import json,sys
data=json.load(sys.stdin)
for w in data.get('data',[]):
  if w.get('url')=='${WEBHOOK_URL}':
    print(w['id'])
    break
" 2>/dev/null || true)"

if [ -n "$EXISTING" ]; then
  echo "Webhook endpoint already exists: $EXISTING"
  WH_SECRET="$(curl -s "https://api.stripe.com/v1/webhook_endpoints/${EXISTING}" -u "${STRIPE_KEY}:" | python3 -c "import json,sys; print(json.load(sys.stdin).get('secret',''))")"
else
  echo "Creating Stripe webhook for $WEBHOOK_URL ..."
  WH_RESP="$(curl -s https://api.stripe.com/v1/webhook_endpoints \
    -u "${STRIPE_KEY}:" \
    -d "url=${WEBHOOK_URL}" \
    -d "enabled_events[]=checkout.session.completed" \
    -d "enabled_events[]=customer.subscription.updated" \
    -d "enabled_events[]=customer.subscription.deleted")"
  WH_SECRET="$(echo "$WH_RESP" | python3 -c "import json,sys; print(json.load(sys.stdin).get('secret',''))")"
fi

if [ -n "$WH_SECRET" ]; then
  set_env "STRIPE_WEBHOOK_SECRET" "$WH_SECRET"
  echo "Webhook secret configured (whsec_...)"
else
  echo "Warning: could not obtain webhook secret — set STRIPE_WEBHOOK_SECRET in Stripe Dashboard"
fi

ensure_price() {
  local slug="$1" name="$2" pence="$3"
  local env_key="STRIPE_VALUESCAN_AGENCY_PRICE_ID"
  [ "$slug" = "pro" ] && env_key="STRIPE_VALUESCAN_PRO_PRICE_ID"

  local existing_id
  existing_id="$(get_env "$VS_ENV" "$env_key")"
  if [ -n "$existing_id" ]; then
    echo "Price $slug already set: $existing_id"
    return
  fi

  PROD="$(curl -s https://api.stripe.com/v1/products -u "${STRIPE_KEY}:" \
    -d "name=${name}" \
    -d "metadata[planSlug]=${slug}" \
    -d "metadata[product]=valuescan")"
  PROD_ID="$(echo "$PROD" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))")"

  PRICE="$(curl -s https://api.stripe.com/v1/prices -u "${STRIPE_KEY}:" \
    -d "product=${PROD_ID}" \
    -d currency=gbp \
    -d unit_amount="${pence}" \
    -d "recurring[interval]=month" \
    -d "metadata[planSlug]=${slug}")"
  PRICE_ID="$(echo "$PRICE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))")"

  if [ -n "$PRICE_ID" ]; then
    set_env "$env_key" "$PRICE_ID"
    echo "Created $slug price: $PRICE_ID"
  fi
}

ensure_price pro "ValueScan Pro" 1900
ensure_price agency "ValueScan Agency" 4900

cd /var/www/valuescan
pm2 restart valuescan --update-env
sleep 2
curl -s http://127.0.0.1:4030/api/billing/config
echo ""
echo "Done. Stripe billing should show stripeEnabled:true"
