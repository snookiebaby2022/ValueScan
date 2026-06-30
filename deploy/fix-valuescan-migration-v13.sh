#!/usr/bin/env bash
set -euo pipefail
DB="/var/www/valuescan/server/valuescan.db"

has_col() {
  sqlite3 "$DB" "PRAGMA table_info($1);" | grep -q "|$2|"
}

add_col() {
  local table=$1 col=$2 ddl=$3
  if ! has_col "$table" "$col"; then
    sqlite3 "$DB" "ALTER TABLE $table ADD COLUMN $col $ddl;"
    echo "Added $table.$col"
  fi
}

add_col valuescan_content_articles slug TEXT
add_col valuescan_content_articles body_html TEXT
add_col valuescan_content_articles publish_url TEXT
add_col valuescan_content_articles scheduled_at TEXT

add_col valuescan_link_outreach target_url TEXT
add_col valuescan_link_outreach contact_email TEXT
add_col valuescan_link_outreach outreach_sent_at TEXT
add_col valuescan_link_outreach link_type "TEXT DEFAULT 'outreach'"
add_col valuescan_link_outreach notes TEXT

add_col valuescan_connected_sites last_autopilot_at TEXT
add_col valuescan_connected_sites next_autopilot_at TEXT
add_col valuescan_connected_sites last_growth_run_at TEXT
add_col valuescan_connected_sites next_growth_run_at TEXT
add_col valuescan_connected_sites cms_webhook_url TEXT
add_col valuescan_connected_sites last_scan_at TEXT

sqlite3 "$DB" "CREATE INDEX IF NOT EXISTS idx_vs_autopilot_next ON valuescan_connected_sites(autopilot_enabled, next_autopilot_at);"
sqlite3 "$DB" "UPDATE schema_version SET version = 13;"
echo "Schema version set to 13"
