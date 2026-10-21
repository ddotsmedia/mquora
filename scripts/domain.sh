#!/bin/bash
# Runs on srv1778407 via Domain Setup workflow. Args: MODE DOMAIN OLD_DOMAIN
set -euo pipefail
MODE="$1"; DOMAIN="$2"; OLD="$3"
case "$DOMAIN$OLD" in *[!a-zA-Z0-9.-]*) echo "Invalid domain"; exit 1;; esac

if [ "$MODE" = "inspect" ]; then
  echo "== nginx sites-enabled =="; ls -la /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null || true
  echo "== files mentioning $OLD or $DOMAIN =="
  grep -rlE "$OLD|$DOMAIN" /etc/nginx/ 2>/dev/null || true
  for f in $(grep -rlE "$OLD" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null); do echo "---- $f"; cat "$f"; done
  echo "== certbot =="; command -v certbot && certbot certificates 2>/dev/null | grep -E "Certificate Name|Domains|Expiry" || echo "certbot not installed"
  echo "== listeners 80/443 =="; ss -ltnp '( sport = :80 or sport = :443 )' || true
  exit 0
fi
echo "Mode $MODE not implemented yet"; exit 1
