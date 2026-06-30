#!/usr/bin/env bash
# Inspect WHMCS API credential IP restrictions (read-only)
set -euo pipefail
CFG=/var/www/whmcs/configuration.php
DB_PASS=$(grep "^\$db_password" "$CFG" | sed "s/.*= '\([^']*\)'.*/\1/")
DB_USER=$(grep "^\$db_username" "$CFG" | sed "s/.*= '\([^']*\)'.*/\1/")
DB_NAME=$(grep "^\$db_name" "$CFG" | sed "s/.*= '\([^']*\)'.*/\1/")

echo "=== API tables ==="
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES LIKE 'tblapi%';" 2>/dev/null

echo "=== Credentials (identifier + allowed IPs) ==="
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "
SELECT c.identifier, c.ip_addresses, r.role
FROM tblapi_credentials c
LEFT JOIN tblapi_roles r ON r.id = c.role_id
" 2>/dev/null || mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DESCRIBE tblapi_credentials;" 2>/dev/null
