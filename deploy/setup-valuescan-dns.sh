#!/bin/bash
# SPF + DMARC DNS records for valuescan.online
# Add these TXT records at your DNS provider (registrar, Cloudflare, etc.)
#
# Verify after adding:
#   dig +short TXT valuescan.online
#   dig +short TXT _dmarc.valuescan.online

set -e

DOMAIN="${1:-valuescan.online}"

echo "=== Required DNS TXT records for ${DOMAIN} ==="
echo ""
echo "1) SPF (host: @ or ${DOMAIN})"
echo "   v=spf1 include:_spf.google.com include:amazonses.com include:spf.brevo.com ~all"
echo "   (Remove includes you do not use — keep only your mail provider.)"
echo ""
echo "2) DMARC (host: _dmarc.${DOMAIN})"
echo "   v=DMARC1; p=none; rua=mailto:hello@${DOMAIN}; fo=1"
echo ""
echo "=== Current DNS (live lookup) ==="
echo "SPF:"
dig +short TXT "$DOMAIN" 2>/dev/null | grep -i spf || echo "  (none found)"
echo ""
echo "DMARC:"
dig +short TXT "_dmarc.${DOMAIN}" 2>/dev/null | grep -i DMARC || echo "  (none found)"
echo ""
echo "Add the records above at your DNS panel, then re-scan ${DOMAIN}."
