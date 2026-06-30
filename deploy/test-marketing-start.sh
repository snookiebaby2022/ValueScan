#!/usr/bin/env bash
set -e
BASE=http://127.0.0.1:4030
curl -sS -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.com","password":"demo123"}' > /tmp/vs-login.json
TOKEN=$(python3 -c "import json; print(json.load(open('/tmp/vs-login.json'))['token'])")
AUTH="Authorization: Bearer $TOKEN"

# Connect site if needed
curl -sS -X POST "$BASE/api/growth/site" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com","label":"Smoke test"}' > /tmp/vs-site.json

curl -sS -X POST "$BASE/api/growth/marketing/start" -H "$AUTH" > /tmp/vs-mkt.json
python3 - <<'PY'
import json
site = json.load(open('/tmp/vs-site.json'))
mkt = json.load(open('/tmp/vs-mkt.json'))
if 'error' in mkt:
    print('ERROR:', mkt['error'])
else:
    cs = mkt.get('campaigns', [])
    print(f'Generated {len(cs)} campaigns for connected site')
    for c in cs:
        print(f"  - {c['channel']:6} {c['status']:10} {c['name']}")
        print(f"    CTA: {c['ctaUrl'][:80]}...")
PY
