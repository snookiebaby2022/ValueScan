#!/usr/bin/env bash
set -euo pipefail
CFG=/var/www/whmcs/configuration.php
DB_PASS=$(grep "^\$db_password" "$CFG" | sed "s/.*= '\([^']*\)'.*/\1/")
DB_USER=$(grep "^\$db_username" "$CFG" | sed "s/.*= '\([^']*\)'.*/\1/")
DB_NAME=$(grep "^\$db_name" "$CFG" | sed "s/.*= '\([^']*\)'.*/\1/")

mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "SHOW TABLES;" | while read -r t; do
  mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "SELECT COUNT(*) FROM \`$t\`" 2>/dev/null | grep -qv '^0$' || continue
  cols=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "SHOW COLUMNS FROM \`$t\`" 2>/dev/null | cut -f1 | tr '\n' ' ')
  echo "$t: $cols" | grep -iE 'identifier|ip_address|api' && echo "  ^^^"
done

echo "--- search identifier in DB ---"
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND COLUMN_NAME LIKE '%identifier%';"
