#!/bin/bash
# Runs on srv1778407 via Domain Setup workflow. Args: MODE DOMAIN OLD_DOMAIN
set -euo pipefail
MODE="$1"; DOMAIN="$2"; OLD="$3"
case "$DOMAIN$OLD" in *[!a-zA-Z0-9.-]*) echo "Invalid domain"; exit 1;; esac

if [ "$MODE" = "inspect" ]; then
  echo "==== /etc/nginx/sites-available/$OLD"; cat "/etc/nginx/sites-available/$OLD" 2>/dev/null || true; echo "==== end"
  echo "== nginx sites-enabled =="; ls -la /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null || true
  echo "== files mentioning $OLD or $DOMAIN =="
  grep -rlE "$OLD|$DOMAIN" /etc/nginx/ 2>/dev/null || true
  for f in $(grep -rlE "$OLD" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null); do echo "---- $f"; cat "$f"; done
  echo "== certbot =="; command -v certbot && certbot certificates 2>/dev/null | grep -E "Certificate Name|Domains|Expiry" || echo "certbot not installed"
  echo "== listeners 80/443 =="; ss -ltnp '( sport = :80 or sport = :443 )' || true
  exit 0
fi
AV=/etc/nginx/sites-available; EN=/etc/nginx/sites-enabled
tar czf "/root/nginx-backup-$(date +%Y%m%d-%H%M%S).tgz" /etc/nginx
reload() { nginx -t && systemctl reload nginx; }

if [ "$MODE" = "apply" ]; then
  if [ ! -e "$AV/$DOMAIN" ]; then
    cat > "$AV/$DOMAIN" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    client_max_body_size 20m;
    location /api/v1/ {
        proxy_pass http://127.0.0.1:3024;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location / {
        proxy_pass http://127.0.0.1:3022;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
server {
    listen 80;
    listen [::]:80;
    server_name admin.$DOMAIN;
    return 301 https://$DOMAIN/admin;
}
EOF
    ln -sf "$AV/$DOMAIN" "$EN/$DOMAIN"
    if ! nginx -t; then rm -f "$EN/$DOMAIN" "$AV/$DOMAIN"; echo "nginx test failed; new site removed"; exit 1; fi
    systemctl reload nginx
    echo "HTTP site for $DOMAIN enabled"
  else
    echo "$AV/$DOMAIN already exists; leaving it as is"
  fi
  certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring --redirect \
    -d "$DOMAIN" -d "www.$DOMAIN" -d "admin.$DOMAIN"
  reload
  for u in "https://$DOMAIN/" "https://$DOMAIN/api/v1/health" "https://www.$DOMAIN/" "https://admin.$DOMAIN/"; do
    echo "$u -> $(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 15 "$u")"
  done
  exit 0
fi

if [ "$MODE" = "redirect-old" ]; then
  F="$AV/$OLD"; [ -f "$F" ] || { echo "$F not found"; exit 1; }
  [ -e "$AV/$DOMAIN" ] || { echo "Run apply for $DOMAIN first"; exit 1; }
  cp -a "$F" "$F.bak-$(date +%Y%m%d-%H%M%S)"
  SSL=$(grep -E 'listen .*443|ssl_certificate|options-ssl-nginx|ssl_dhparam' "$F")
  [ -n "$SSL" ] || { echo "No TLS lines in $F"; exit 1; }
  BAK=$(ls -t "$F".bak-* | head -1)
  cat > "$F" <<EOF
# $OLD permanently redirects to $DOMAIN (previous config: $BAK)
server {
    server_name $OLD www.$OLD;
$SSL
    return 301 https://$DOMAIN\$request_uri;
}
server {
    listen 80;
    listen [::]:80;
    server_name $OLD www.$OLD;
    return 301 https://$DOMAIN\$request_uri;
}
EOF
  if ! nginx -t; then cp -a "$BAK" "$F"; echo "nginx test failed; restored $OLD config"; exit 1; fi
  systemctl reload nginx
  echo "https://$OLD/questions -> $(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 15 "https://$OLD/questions")"
  exit 0
fi
echo "Unknown mode $MODE"; exit 1
