#!/bin/bash
# Runs on the VPS, invoked by GitHub Actions. Pulls prebuilt images and restarts only mquora services.
set -euo pipefail

cd /opt/mquora
COMPOSE="docker compose -p mquora -f docker-compose.prod.yml --env-file .env"

# Env file is copied from the GitHub Actions secret PROD_ENV on each deploy.
cp -f prod.env .env && chmod 600 .env
set -a; . ./.env; set +a

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin >/dev/null

echo "Pulling images for ${IMAGE_TAG}..."
$COMPOSE pull web api worker

echo "Starting database and cache..."
$COMPOSE up -d postgres redis
for i in $(seq 1 30); do
  state=$($COMPOSE ps --format json postgres | grep -o '"Health":"[a-z]*"' | head -1 || true)
  [[ "$state" == *healthy* ]] && break
  sleep 2
done

echo "Applying database migrations..."
$COMPOSE run --rm --no-deps api sh -c 'pnpm --filter @mquora/db exec prisma migrate deploy --schema=prisma/schema.prisma'

echo "Starting application services..."
$COMPOSE up -d --remove-orphans web api worker
$COMPOSE ps

# Remove older mquora image tags only (never system-wide prune: the VPS hosts other projects).
docker image ls --format '{{.Repository}}:{{.Tag}}' \
  | grep "^ghcr.io/${GITHUB_REPOSITORY}/" \
  | grep -v ":${IMAGE_TAG}$" | grep -v ':latest$' \
  | xargs -r docker image rm >/dev/null 2>&1 || true

echo "Deploy complete: ${IMAGE_TAG}"
