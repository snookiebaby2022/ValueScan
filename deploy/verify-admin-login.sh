#!/usr/bin/env bash
curl -sS -X POST http://127.0.0.1:4030/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@valuescan.online","password":"eIQBKpbbGPjTcd53HwbVVCoR"}' > /tmp/new-admin.json
python3 -c "import json; d=json.load(open('/tmp/new-admin.json')); print('new admin:', d['user']['role'], d['user']['email'])"

curl -sS -X POST http://127.0.0.1:4030/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.com","password":"demo123"}' > /tmp/demo-admin.json
python3 -c "import json; d=json.load(open('/tmp/demo-admin.json')); print('demo user:', d.get('user',{}).get('role','login failed'))"
