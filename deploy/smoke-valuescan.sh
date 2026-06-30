#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://127.0.0.1:4030}"
PASS=0
FAIL=0

ok() { echo "OK  $1"; PASS=$((PASS + 1)); }
bad() { echo "FAIL $1"; FAIL=$((FAIL + 1)); }

echo "=== ValueScan smoke tests ($BASE) ==="

H=$(curl -sS -m 10 "$BASE/api/health" || true)
if echo "$H" | grep -q '"ok":true'; then ok "health"; else bad "health: $H"; fi

curl -sS -m 10 "$BASE/api/audit/plans" > /tmp/vs-plans.json
if python3 /tmp/vs-check-plans.py /tmp/vs-plans.json 2>/dev/null; then
  ok "pricing feature lists"
else
  python3 /tmp/vs-check-plans.py /tmp/vs-plans.json || true
  bad "pricing feature lists"
fi

LOGIN=$(curl -sS -m 10 -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.com","password":"demo123"}')
echo "$LOGIN" > /tmp/vs-login.json
TOKEN=$(python3 -c "import json; print(json.load(open('/tmp/vs-login.json')).get('token',''))" 2>/dev/null || true)
if [ -n "$TOKEN" ]; then ok "demo login"; else bad "demo login: $(cat /tmp/vs-login.json)"; fi

if [ -n "$TOKEN" ]; then
  curl -sS -m 10 "$BASE/api/audit/me" -H "Authorization: Bearer $TOKEN" > /tmp/vs-me.json
  PLAN=$(python3 -c "import json; print(json.load(open('/tmp/vs-me.json'))['plan']['slug'])")
  HAS_ROADMAP=$(python3 -c "import json; f=json.load(open('/tmp/vs-me.json'))['features']; print('yes' if 'growth_roadmap' in f else 'no')")
  echo "     demo user plan: $PLAN, growth_roadmap: $HAS_ROADMAP"

  CODE=$(curl -sS -m 10 -o /tmp/vs-grow.json -w '%{http_code}' "$BASE/api/growth/dashboard" -H "Authorization: Bearer $TOKEN")
  if [ "$HAS_ROADMAP" = "yes" ] && [ "$CODE" = "200" ]; then
    ok "growth dashboard 200 for pro+ demo"
    python3 -c "
import json
d=json.load(open('/tmp/vs-grow.json'))
acc=d.get('access',{})
print('     access.marketingCampaigns:', acc.get('marketingCampaigns'))
print('     campaigns:', len(d.get('campaigns',[])))
print('     summary.campaignsActive:', d.get('summary',{}).get('campaignsActive'))
"
  elif [ "$HAS_ROADMAP" = "no" ] && [ "$CODE" = "403" ]; then
    ok "growth dashboard 403 for free demo"
  else
    bad "growth dashboard code=$CODE roadmap=$HAS_ROADMAP body=$(head -c 200 /tmp/vs-grow.json)"
  fi
fi

RAND="smoke$(date +%s)@example.com"
REG=$(curl -sS -m 10 -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$RAND\",\"password\":\"demo1234\",\"name\":\"Smoke Test\"}")
echo "$REG" > /tmp/vs-reg.json
FTOKEN=$(python3 -c "import json; print(json.load(open('/tmp/vs-reg.json')).get('token',''))" 2>/dev/null || true)
if [ -n "$FTOKEN" ]; then
  ok "register ephemeral free user ($RAND)"
  FCODE=$(curl -sS -m 10 -o /tmp/vs-free-grow.json -w '%{http_code}' "$BASE/api/growth/dashboard" -H "Authorization: Bearer $FTOKEN")
  [ "$FCODE" = "403" ] && ok "free user blocked from growth dashboard" || bad "free growth code=$FCODE $(head -c 120 /tmp/vs-free-grow.json)"
  FMKT=$(curl -sS -m 10 -o /tmp/vs-free-mkt.json -w '%{http_code}' -X POST "$BASE/api/growth/marketing/start" -H "Authorization: Bearer $FTOKEN")
  [ "$FMKT" = "403" ] && ok "free user blocked from marketing" || bad "free marketing code=$FMKT"
else
  bad "register free user: $(cat /tmp/vs-reg.json)"
fi

VER=$(sqlite3 /var/www/valuescan/server/valuescan.db 'SELECT version FROM schema_version;' 2>/dev/null || echo 0)
[ "$VER" = "15" ] && ok "schema version 15" || bad "schema version is $VER (expected 15)"

if sqlite3 /var/www/valuescan/server/valuescan.db "SELECT 1 FROM sqlite_master WHERE name='valuescan_marketing_campaigns';" | grep -q 1; then
  ok "marketing campaigns table exists"
else
  bad "marketing campaigns table missing"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
