#!/bin/bash
# Dumps the askvyo database to /opt/askvyo/backups and keeps the last KEEP_DAYS days.
# Touches only the askvyo postgres container; other projects on the VPS are not affected.
# Prints the path of the new dump as the last line of output.
set -euo pipefail

cd /opt/askvyo
KEEP_DAYS="${KEEP_DAYS:-14}"
DIR=/opt/askvyo/backups
mkdir -p "$DIR" && chmod 700 "$DIR"

set -a; . ./.env; set +a
COMPOSE="docker compose -p askvyo -f docker-compose.prod.yml --env-file .env"

STAMP=$(date -u +%Y%m%d-%H%M%S)
OUT="$DIR/askvyo-${STAMP}.sql.gz"
TMP="$OUT.partial"

# Remove partial file on any error so we never leave a corrupt dump.
trap 'rm -f "$TMP"' ERR

# Plain SQL, gzipped. --clean/--if-exists makes restore idempotent.
$COMPOSE exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists \
  | gzip -9 > "$TMP"

# A real dump is never tiny; refuse to keep an empty/failed one.
if [ "$(stat -c %s "$TMP")" -lt 1024 ]; then
  rm -f "$TMP"
  echo "ERROR: backup looks empty, not kept" >&2
  exit 1
fi
mv "$TMP" "$OUT" && chmod 600 "$OUT"

# Rotate: only our own files in our own folder.
find "$DIR" -maxdepth 1 -name 'askvyo-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "Backups on server:"
ls -lh "$DIR" | tail -n +2
echo "$OUT"
