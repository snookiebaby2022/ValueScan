#!/usr/bin/env bash
# Find WHMCS API IP restriction columns (no secrets printed)
set -euo pipefail
CFG=/var/www/whmcs/configuration.php
DB_PASS=$(grep "^\$db_password" "$CFG" | sed "s/.*= '\([^']*\)'.*/\1/")
DB_USER=$(grep "^\$db_username" "$CFG" | sed "s/.*= '\([^']*\)'.*/\1/")
DB_NAME=$(grep "^\$db_name" "$CFG" | sed "s/.*= '\([^']*\)'.*/\1/")

mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DESCRIBE tbldeviceauth;"
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES LIKE '%device%';"
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND COLUMN_NAME LIKE '%ip%';" | head -30
